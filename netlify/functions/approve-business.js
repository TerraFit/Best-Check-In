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

  // Initialize Supabase inside handler
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { businessId } = JSON.parse(event.body);

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    // Get business details first (to use in email)
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching business:', fetchError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error fetching business details' })
      };
    }

    // Generate verification token
    const verificationToken = uuidv4();
    const verificationLink = `https://fastcheckin.netlify.app/verify-email/${verificationToken}`;

    // Save verification token
    const { error: tokenError } = await supabase
      .from('email_verifications')
      .insert([{
        token: verificationToken,
        business_id: businessId,
        email: business.email,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      }]);

    if (tokenError) {
      console.error('❌ Error saving verification token:', tokenError);
      // Continue anyway - business can still be approved
    }

    // Update business status to approved
    const { data, error } = await supabase
      .from('businesses')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error', details: error.message })
      };
    }

    if (!data) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found or already approved' })
      };
    }

    // Send welcome email (don't fail if email doesn't work)
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: 'FastCheckin <welcome@fastcheckin.app>',
        to: [business.email],
        subject: `Welcome to FastCheckin, ${business.trading_name}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1e1e1e;">Welcome to FastCheckin!</h1>
            <p>Dear ${business.trading_name},</p>
            <p>Your business has been approved! Please verify your email address to get started:</p>
            <a href="${verificationLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Verify Email Address</a>
            <p>This link expires in 48 hours.</p>
            <p>Best regards,<br>The FastCheckin Team</p>
          </div>
        `
      });
      console.log('✅ Welcome email sent to:', business.email);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      // Don't fail the approval if email fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Business approved successfully',
        business: data
      })
    };

  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
