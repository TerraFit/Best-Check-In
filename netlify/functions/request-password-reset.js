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

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Business password reset: Supabase configuration missing');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    if (!process.env.RESEND_API_KEY) {
      console.error('Business password reset: RESEND_API_KEY is missing');
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Email recovery is temporarily unavailable. Please contact your administrator.' }) };
    }

    const { email } = JSON.parse(event.body || '{}');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email is required' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('id, trading_name, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (fetchError) {
      console.error('Business password reset lookup failed:', fetchError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to start password recovery' }) };
    }
    if (!business) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'If the email exists, a reset link has been sent' }) };
    }

    const resetToken = crypto.randomUUID();
    const resetLink = `https://fastcheckin.co.za/reset-password/${resetToken}`;
    const { error: tokenError } = await supabase.from('password_resets').insert([{
      token: resetToken,
      business_id: business.id,
      email: business.email,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }]);

    if (tokenError) {
      console.error('Business password reset token insert failed:', tokenError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to start password recovery' }) };
    }

    const safeTradingName = String(business.trading_name || 'there').replace(/[<>]/g, '');
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
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

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Reset link sent successfully' }) };
  } catch (error) {
    console.error('Business password reset error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to start password recovery' }) };
  }
};
