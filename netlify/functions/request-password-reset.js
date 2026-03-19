import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Check if business exists
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('id, trading_name, email')
      .eq('email', email)
      .single();

    if (fetchError || !business) {
      // Return success even if email not found (security best practice)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'If the email exists, a reset link has been sent' 
        })
      };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetLink = `https://fastcheckin.co.za/reset-password/${resetToken}`;

    // Save reset token to database
    const { error: tokenError } = await supabase
      .from('password_resets')
      .insert([{
        token: resetToken,
        business_id: business.id,
        email: business.email,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      }]);

    if (tokenError) {
      console.error('Error saving reset token:', tokenError);
    }

    // Send reset email - UPDATED WITH YOUR VERIFIED DOMAIN
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'FastCheckin <noreply@fastcheckin.co.za>', // ✅ Updated to your verified domain
      to: [business.email],
      subject: 'Reset your FastCheckin password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f59e0b;">FastCheckin</h1>
          <p>Hello ${business.trading_name},</p>
          <p>We received a request to reset your password. Click the link below to choose a new one:</p>
          <a href="${resetLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Reset link sent successfully' 
      })
    };

  } catch (error) {
    console.error('Error in password reset:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
