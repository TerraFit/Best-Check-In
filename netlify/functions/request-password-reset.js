import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

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

    stage = 'supabase-client';
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    stage = 'business-lookup';
    // Limit to one row so duplicate legacy business emails cannot turn a valid
    // recovery request into a PostgREST "multiple rows" error.
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('id, trading_name, email')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Business password reset lookup failed:', {
        stage,
        code: fetchError.code,
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint
      });
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to start password recovery' }) };
    }

    // Keep account enumeration behaviour unchanged.
    if (!business) {
      console.info('Business password reset requested for unknown email');
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'If the email exists, a reset link has been sent' }) };
    }

    stage = 'token-insert';
    const resetToken = crypto.randomUUID();
    const resetLink = `https://fastcheckin.co.za/reset-password/${resetToken}`;
    const { error: tokenError } = await supabase.from('password_resets').insert([{
      token: resetToken,
      business_id: business.id,
      email: business.email,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }]);

    if (tokenError) {
      console.error('Business password reset token insert failed:', {
        stage,
        code: tokenError.code,
        message: tokenError.message,
        details: tokenError.details,
        hint: tokenError.hint
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
      await supabase.from('password_resets').delete().eq('token', resetToken);
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
