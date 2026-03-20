import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

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
    const { businessId } = JSON.parse(event.body);

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    // Get business details
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
    const verificationLink = `https://fastcheckin.co.za/verify-email/${verificationToken}`;

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

    // Generate QR Code
    const checkInUrl = `https://fastcheckin.co.za/checkin/${businessId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#f59e0b',
        light: '#ffffff'
      }
    });

    const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

    // Send welcome email
    console.log('📧 Attempting to send email to:', business.email);
    console.log('🔑 Checking RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'exists' : 'MISSING');
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Now send the real email with VERIFIED DOMAIN
    try {
      const emailResult = await resend.emails.send({
        from: 'FastCheckin <welcome@fastcheckin.co.za>', // ✅ UPDATED with verified domain
        to: [business.email],
        subject: `🎉 Welcome to FastCheckin, ${business.trading_name}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #f59e0b; margin: 0;">FastCheckin</h1>
              <p style="color: #666; margin: 5px 0 0;">Seamless Check-in, Smarter Stay</p>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Welcome, ${business.trading_name}!</h2>
            
            <p style="color: #555; line-height: 1.6;">Your business has been approved! Here's your personalized QR code for guest check-ins:</p>
            
            <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">
              <img src="${qrCodeDataUrl}" alt="QR Code" style="display: block; margin: 0 auto 20px; max-width: 200px; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <p style="color: #333; font-weight: bold; margin: 10px 0;">Scan to check in to ${business.trading_name}</p>
              <p style="color: #777; font-size: 14px; word-break: break-all;">${checkInUrl}</p>
            </div>
            
            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h3 style="color: #0284c7; margin: 0 0 10px 0;">✨ Next Steps:</h3>
              <ol style="color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li><strong>Download your QR code</strong> (attached to this email)</li>
                <li><strong>Print and display</strong> at your reception desk</li>
                <li><strong>Verify your email</strong> to access your dashboard</li>
                <li><strong>Customize your check-in page</strong> with your logo and colors</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ✓ Verify Email & Access Dashboard
              </a>
            </div>
          </div>
        `,
        attachments: [{
          filename: `${business.trading_name.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`,
          content: qrBuffer.toString('base64'),
          encoding: 'base64',
          contentType: 'image/png'
        }]
      });

      console.log('✅ Email sent successfully!');
      console.log('📧 Email result:', JSON.stringify(emailResult, null, 2));
      
    } catch (emailError) {
      console.error('❌ EMAIL SEND FAILED!');
      console.error('❌ Error name:', emailError.name);
      console.error('❌ Error message:', emailError.message);
      console.error('❌ Full error object:', emailError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Business approved successfully',
        business: data,
        checkInUrl,
        qrCode: qrCodeDataUrl
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
