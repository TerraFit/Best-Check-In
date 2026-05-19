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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials' })
    };
  }

  try {
    let businessId;
    try {
      const body = JSON.parse(event.body);
      businessId = body.businessId;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID is required' })
      };
    }

    console.log(`📝 Processing approval for business ID: ${businessId}`);

    // Fetch business details via REST
    const fetchResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const businesses = await fetchResponse.json();
    const business = businesses?.[0];

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    if (business.status === 'approved') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business is already approved' })
      };
    }

    if (business.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Business cannot be approved from status: ${business.status}` })
      };
    }

    console.log(`✅ Business found: ${business.trading_name} (${business.email})`);

    // Generate verification token for email verification
    const verificationToken = uuidv4();
    const verificationLink = `https://fastcheckin.co.za/verify-email/${verificationToken}`;

    // Save verification token via REST
    await fetch(`${supabaseUrl}/rest/v1/email_verifications`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        token: verificationToken,
        business_id: businessId,
        email: business.email,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      }])
    });

    // Update business status to approved via REST
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Error updating business status:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to approve business',
          details: errorText
        })
      };
    }

    const updatedData = await updateResponse.json();
    const updatedBusiness = updatedData[0];

    console.log(`✅ Business status updated to approved for: ${business.trading_name}`);

    // Generate QR code for check-in
    const checkInUrl = `https://fastcheckin.co.za/checkin/${businessId}`;
    let qrCodeDataUrl = null;
    let qrBuffer = null;

    try {
      qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#f59e0b',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      
      qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      console.log('✅ QR code generated successfully');
    } catch (qrError) {
      console.error('⚠️ Error generating QR code (non-critical):', qrError);
    }

    // Send welcome email with QR code
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        const emailResult = await resend.emails.send({
          from: 'FastCheckin <welcome@fastcheckin.co.za>',
          to: [business.email],
          subject: `🎉 Welcome to FastCheckin, ${business.trading_name}!`,
          html: generateWelcomeEmail(business.trading_name, verificationLink, checkInUrl, qrCodeDataUrl),
          attachments: qrBuffer ? [{
            filename: `${business.trading_name.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`,
            content: qrBuffer.toString('base64'),
            encoding: 'base64',
            contentType: 'image/png'
          }] : undefined
        });

        console.log('✅ Welcome email sent successfully:', emailResult.id);
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    } else {
      console.warn('RESEND_API_KEY not configured - email not sent');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Business approved successfully',
        business: {
          id: updatedBusiness.id,
          trading_name: updatedBusiness.trading_name,
          email: updatedBusiness.email,
          status: updatedBusiness.status
        },
        checkInUrl,
        qrCode: qrCodeDataUrl,
        emailSent,
        verificationLink
      })
    };

  } catch (error) {
    console.error('Unhandled error in approve-business function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

// Helper function to generate welcome email HTML
function generateWelcomeEmail(businessName, verificationLink, checkInUrl, qrCodeDataUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to FastCheckin</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #1e1e1e;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content {
          padding: 40px 30px;
        }
        .qr-box {
          background: #f3f4f6;
          padding: 30px;
          border-radius: 16px;
          margin: 30px 0;
          text-align: center;
        }
        .qr-box img {
          display: block;
          margin: 0 auto 20px;
          max-width: 200px;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-radius: 16px;
        }
        .button {
          display: inline-block;
          background: #f59e0b;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          margin: 20px 0;
        }
        .next-steps {
          background: #e8f4fd;
          padding: 20px;
          border-radius: 12px;
          margin: 30px 0;
        }
        .footer {
          background: #f9fafb;
          padding: 24px 30px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to FastCheckin!</h1>
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${businessName}!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Your business has been approved! You're now ready to start using FastCheckin for digital guest check-ins.
          </p>
          
          <div class="qr-box">
            ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code">` : '<p>QR code generation failed. Please log in to download your QR code.</p>'}
            <p style="color: #333; font-weight: bold; margin: 10px 0;">Scan to check in guests</p>
            <p style="color: #777; font-size: 14px; word-break: break-all;">${checkInUrl}</p>
          </div>
          
          <div class="next-steps">
            <h3 style="color: #0284c7; margin: 0 0 10px 0;">✨ Next Steps:</h3>
            <ol style="color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li><strong>Verify your email</strong> - Click the button below to set up your password</li>
              <li><strong>Download your QR code</strong> - Print and display at your reception</li>
              <li><strong>Customize your check-in page</strong> - Add your logo and colors</li>
              <li><strong>Start accepting guest check-ins</strong> - Guests scan and complete registration</li>
            </ol>
          </div>
          
          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">
              ✓ Verify Email & Set Password
            </a>
          </div>
          
          <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px;">
            This verification link expires in 48 hours.
          </p>
        </div>
        
        <div class="footer">
          <p>FastCheckin - Seamless Check-in, Smarter Stay</p>
          <p><a href="https://fastcheckin.co.za" style="color: #f59e0b;">www.fastcheckin.co.za</a></p>
          <p>© ${new Date().getFullYear()} FastCheckin. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
