import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import QRCode from 'qrcode';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const businessData = JSON.parse(event.body);

    // 1. Save business to database
    const { data: business, error: dbError } = await supabase
      .from('businesses')
      .insert([{
        ...businessData,
        status: 'pending',
        subscription_tier: 'trial',
        subscription_expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Generate QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(
      `https://fastcheckin.app/activate/${business.id}`,
      { width: 300 }
    );

    // 3. Generate PDF with credentials
    // (You'd use a PDF library like puppeteer or pdfkit)

    // 4. Send email with links and QR code
    await resend.emails.send({
      from: 'Fast Checkin <noreply@fastcheckin.app>',
      to: [businessData.email],
      subject: 'Welcome to Fast Checkin - Complete Your Setup',
      html: `
        <h1>Welcome ${businessData.tradingName}!</h1>
        <p>Your registration is pending approval. Once approved, you'll receive:</p>
        <ul>
          <li>Link to create your admin account</li>
          <li>QR code for guest check-in</li>
          <li>Setup instructions for your property</li>
        </ul>
        <p>We'll notify you within 24 hours.</p>
      `
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        businessId: business.id,
        message: 'Registration submitted successfully'
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Registration failed' })
    };
  }
}
