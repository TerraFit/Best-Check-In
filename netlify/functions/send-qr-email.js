import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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
    const { businessId, businessName, qrCodeUrl, checkInUrl } = JSON.parse(event.body);

    // Get business email from database
    const { data: business, error } = await supabase
      .from('businesses')
      .select('email, trading_name')
      .eq('id', businessId)
      .single();

    if (error || !business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    // Send email with QR code
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'FastCheckin <onboarding@resend.dev>', // Update to your verified domain later
      to: [business.email],
      subject: `📱 Your FastCheckin QR Code - ${business.trading_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b; margin: 0;">FastCheckin</h1>
            <p style="color: #666; margin: 5px 0 0;">Your QR Code is ready!</p>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">${business.trading_name}</h2>
          
          <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">
            <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 200px; margin-bottom: 20px;">
            <p style="color: #333; font-weight: bold; margin: 10px 0;">Scan for guest check-in</p>
            <p style="color: #777; font-size: 14px; word-break: break-all;">${checkInUrl}</p>
          </div>
          
          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #0284c7; margin: 0 0 10px 0;">✨ Instructions:</h3>
            <ul style="color: #555; line-height: 1.6;">
              <li>Print this QR code and display at your reception</li>
              <li>Guests scan with their phone camera</li>
              <li>They'll be taken to your branded check-in page</li>
            </ul>
          </div>
          
          <p style="color: #777; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center;">
            Need help? Contact us at support@fastcheckin.co.za
          </p>
        </div>
      `,
      attachments: [{
        filename: `${business.trading_name.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`,
        content: qrCodeUrl.split(',')[1], // Remove data:image/png;base64, prefix
        encoding: 'base64',
        contentType: 'image/png'
      }]
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'QR Code email sent successfully' 
      })
    };

  } catch (error) {
    console.error('Error sending QR email:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
