import { Resend } from 'resend';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function handler(event) {
  const { businessId } = JSON.parse(event.body);

  // Get business details
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  // Generate unique setup token
  const setupToken = crypto.randomUUID();
  const setupLink = `https://fastcheckin.app/setup/${setupToken}`;

  // Store token
  await supabase
    .from('setup_tokens')
    .insert([{
      token: setupToken,
      business_id: businessId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }]);

  // Generate QR codes in multiple formats
  const qrPng = await QRCode.toBuffer(setupLink, { type: 'png' });
  const qrJpeg = await QRCode.toBuffer(setupLink, { type: 'jpeg' });
  const qrSvg = await QRCode.toString(setupLink, { type: 'svg' });

  // Send email with credentials
  await resend.emails.send({
    from: 'Fast Checkin <noreply@fastcheckin.app>',
    to: [business.email],
    subject: `Welcome ${business.tradingName} - Your Fast Checkin Account is Ready!`,
    attachments: [
      {
        filename: 'qr-code.png',
        content: qrPng.toString('base64')
      },
      {
        filename: 'qr-code.jpg',
        content: qrJpeg.toString('base64')
      },
      {
        filename: 'qr-code.svg',
        content: qrSvg
      }
    ],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2D3E40;">Welcome to Fast Checkin, ${business.tradingName}!</h1>
        
        <p>Your business registration has been approved. Here's everything you need to get started:</p>
        
        <div style="background: #F5F5F0; padding: 24px; border-radius: 16px; margin: 24px 0;">
          <h2 style="color: #7D5A50; margin-top: 0;">Account Setup</h2>
          <p><strong>Setup Link:</strong> <a href="${setupLink}">${setupLink}</a></p>
          <p>Click this link to create your admin account and configure your property details.</p>
        </div>
        
        <div style="background: #F5F5F0; padding: 24px; border-radius: 16px; margin: 24px 0;">
          <h2 style="color: #7D5A50; margin-top: 0;">Guest Check-in QR Code</h2>
          <p>Display this QR code at your reception. Guests can scan it to start their check-in.</p>
          <p><em>QR code images attached to this email in PNG, JPG, and SVG formats.</em></p>
        </div>
        
        <div style="background: #C5A059; color: white; padding: 24px; border-radius: 16px; margin: 24px 0;">
          <h2 style="margin-top: 0;">Next Steps</h2>
          <ol style="margin-bottom: 0;">
            <li>Click the setup link above</li>
            <li>Create your admin username and password</li>
            <li>Enter your property details (rooms, pricing, seasons)</li>
            <li>Import your existing guest data (optional)</li>
            <li>Start using Fast Checkin!</li>
          </ol>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 32px;">
          © 2026 Fast Checkin. All rights reserved.
        </p>
      </div>
    `
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
}
