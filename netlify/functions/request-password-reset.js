import crypto from 'node:crypto';

const supabaseUrl = () => String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = () => process.env.SUPABASE_SERVICE_KEY;

const supabaseHeaders = () => ({
  apikey: supabaseKey(),
  Authorization: `Bearer ${supabaseKey()}`,
  'Content-Type': 'application/json'
});

async function supabaseRest(path, options = {}) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...supabaseHeaders(),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const error = new Error(`Supabase REST error ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  let stage = 'initialization';

  try {
    const missing = [];
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');
    if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');

    if (missing.length) {
      console.error('Business password reset configuration missing:', missing.join(', '));
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'Email recovery is temporarily unavailable. Please contact your administrator.' })
      };
    }

    stage = 'parse-request';
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }

    const normalizedEmail = String(body.email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email is required' }) };
    }

    // IMPORTANT: Do not instantiate @supabase/supabase-js here. Netlify's
    // Node.js 20 runtime does not provide the native WebSocket required by
    // newer supabase-js realtime-js versions. This endpoint only needs
    // PostgREST, so use the HTTPS REST API directly.
    stage = 'business-lookup';
    let businessRows;
    try {
      businessRows = await supabaseRest(
        `businesses?select=id%2Ctrading_name%2Cemail&email=ilike.${encodeURIComponent(normalizedEmail)}&limit=1`
      );
    } catch (error) {
      console.error('Business password reset lookup failed:', {
        stage,
        status: error?.status,
        body: error?.body
      });
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to start password recovery' }) };
    }

    const business = Array.isArray(businessRows) ? businessRows[0] : null;

    // Keep account enumeration behaviour unchanged.
    if (!business) {
      console.info('Business password reset requested for unknown email');
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'If the email exists, a reset link has been sent' }) };
    }

    stage = 'token-insert';
    const resetToken = crypto.randomUUID();
    const resetLink = `https://fastcheckin.co.za/reset-password/${resetToken}`;

    try {
      await supabaseRest('password_resets', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          token: resetToken,
          business_id: business.id,
          email: business.email,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
      });
    } catch (error) {
      console.error('Business password reset token insert failed:', {
        stage,
        status: error?.status,
        body: error?.body
      });
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to start password recovery' }) };
    }

    stage = 'resend';
    const safeTradingName = String(business.trading_name || 'there').replace(/[<>]/g, '');
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FastCheckin <noreply@fastcheckin.co.za>',
        to: [business.email],
        subject: 'Reset your FastCheckin password',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#f59e0b">FastCheckin</h1><p>Hello ${safeTradingName},</p><p>We received a request to reset your password. Click the link below to choose a new one:</p><a href="${resetLink}" style="display:inline-block;background:#f59e0b;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;margin:20px 0">Reset Password</a><p>This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p></div>`
      })
    });

    if (!emailResponse.ok) {
      const detail = await emailResponse.text();
      console.error('Resend password reset failed:', emailResponse.status, detail);

      // Best-effort cleanup of the token if email delivery fails.
      try {
        await supabaseRest(`password_resets?token=eq.${encodeURIComponent(resetToken)}`, {
          method: 'DELETE'
        });
      } catch (cleanupError) {
        console.error('Business password reset token cleanup failed:', {
          status: cleanupError?.status,
          body: cleanupError?.body
        });
      }

      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Email recovery is temporarily unavailable. Please try again later.' }) };
    }

    console.info('Business password reset email sent successfully');
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Reset link sent successfully' }) };
  } catch (error) {
    console.error('Business password reset error:', {
      stage,
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to start password recovery' }) };
  }
};
