import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

export const handler = async function(event) {
  console.log('🔵 FUNCTION STARTED');
  console.log('🔵 Time:', new Date().toISOString());
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('🔵 Handling OPTIONS preflight');
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    console.log('🔵 Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  console.log('🔵 Initializing Supabase...');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { email } = JSON.parse(event.body);
    console.log('🔵 Email received:', email);

    if (!email) {
      console.log('🔵 No email provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Check if business exists
    console.log('🔵 Checking business for email:', email);
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('id, trading_name, email')
      .eq('email', email)
      .single();

    if (fetchError || !business) {
      console.log('🔵 No business found for email:', email);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'If the email exists, a reset link has been sent' 
        })
      };
    }

    console.log('🔵 Business found:', business.id, business.trading_name);

    // Generate reset token
    const resetToken = uuidv4();
    const resetLink = `https://fastcheckin.co.za/reset-password/${resetToken}`;
    console.log('🔵 Reset token generated:', resetToken);

    // Save reset token to database
    console.log('🔵 Saving token to database...');
    const { error: tokenError } = await supabase
      .from('password_resets')
      .insert([{
        token: resetToken,
        business_id: business.id,
        email: business.email,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }]);

    if (tokenError) {
      console.error('❌ Error saving reset token:', tokenError);
    } else {
      console.log('✅ Token saved successfully');
    }

    // Check Resend API key
    console.log('🔵 Checking RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    
    // Initialize Resend
    console.log('🔵 Initializing Resend...');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Prepare email
    const emailData = {
      from: 'FastCheckin <noreply@fastcheckin.co.za>',
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
    };
    
    console.log('🔵 Sending email with data:', JSON.stringify(emailData, null, 2));
    
    const emailResult = await resend.emails.send(emailData);
    console.log('✅ Resend API response:', JSON.stringify(emailResult, null, 2));

    console.log('🔵 Function completed successfully');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Reset link sent successfully' 
      })
    };

  } catch (error) {
    console.error('❌ CATASTROPHIC ERROR:', error);
    console.error('❌ Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
