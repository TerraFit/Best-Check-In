import { Handler } from '@netlify/functions';

interface BookingData {
  guest_name: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  business_name?: string;
  business_logo?: string;
  total_amount?: number;
}

export const handler: Handler = async (event) => {
  // Log every attempt
  console.log('📧 Email function triggered', new Date().toISOString());

  try {
    if (!event.body) {
      throw new Error('No booking data provided');
    }

    const booking: BookingData = JSON.parse(event.body);
    console.log('📧 Sending email to:', booking.guest_email);
    console.log('📧 Booking details:', {
      guest_name: booking.guest_name,
      check_in: booking.check_in_date,
      nights: booking.nights
    });

    // Using Resend (recommended - free tier 3000 emails/month)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Email service not configured' })
      };
    }

    const emailHtml = generateEmailTemplate(booking);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FastCheckin <checkin@fastcheckin.co.za>',
        to: [booking.guest_email],
        subject: `✅ Check-in Confirmed: ${booking.business_name || 'Your Stay'}`,
        html: emailHtml,
        reply_to: 'support@fastcheckin.co.za'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Resend API error:', result);
      throw new Error(`Email sending failed: ${result.message}`);
    }

    console.log('✅ Email sent successfully:', result.id);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: result.id })
    };

  } catch (error) {
    console.error('❌ Email function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

function generateEmailTemplate(booking: BookingData): string {
  const businessName = booking.business_name || 'your accommodation';
  const guestName = booking.guest_name?.split(' ')[0] || 'Guest';
  const checkInDate = new Date(booking.check_in_date).toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const checkOutDate = new Date(booking.check_out_date).toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Check-in Confirmed</title>
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
        .greeting {
          font-size: 18px;
          margin-bottom: 24px;
          color: #1e1e1e;
        }
        .booking-details {
          background: #f9fafb;
          border-radius: 16px;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e5e7eb;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #4b5563;
        }
        .detail-value {
          color: #1e1e1e;
          font-weight: 500;
        }
        .button {
          display: inline-block;
          background: #f59e0b;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 9999px;
          font-weight: 600;
          margin: 24px 0;
          text-align: center;
        }
        .newsletter-block {
          background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
          border: 2px solid #f59e0b;
          border-radius: 20px;
          padding: 30px;
          margin: 30px 0;
          text-align: center;
        }
        .newsletter-block h2 {
          color: #1e1e1e;
          font-size: 24px;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .newsletter-block .prize {
          font-size: 18px;
          font-weight: 700;
          color: #f59e0b;
          margin-bottom: 20px;
        }
        .benefits {
          text-align: left;
          display: inline-block;
          margin: 20px 0;
          list-style: none;
          padding-left: 0;
        }
        .benefits li {
          margin: 10px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .benefits li::before {
          content: "✓";
          color: #10b981;
          font-weight: bold;
          font-size: 18px;
        }
        .subscribe-btn {
          display: inline-block;
          background: #f59e0b;
          color: #1e1e1e;
          padding: 14px 40px;
          text-decoration: none;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 16px;
          margin: 20px 0 10px;
          transition: all 0.3s ease;
        }
        .subscribe-btn:hover {
          background: #f97316;
          transform: scale(1.05);
        }
        .fine-print {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 16px;
        }
        .footer {
          background: #f9fafb;
          padding: 24px 30px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }
        .divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #e5e7eb, transparent);
          margin: 24px 0;
        }
        @media (max-width: 600px) {
          .container {
            margin: 20px;
          }
          .content {
            padding: 24px 20px;
          }
          .newsletter-block {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Check-in Confirmed!</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hi <strong>${guestName}</strong>,
          </div>
          
          <p>
            Welcome to <strong>${businessName}</strong>! We're thrilled to have you stay with us.
            Your check-in has been successfully completed.
          </p>
          
          <div class="booking-details">
            <h3 style="margin-top: 0; margin-bottom: 16px; color: #f59e0b;">
              📋 Your Stay Details
            </h3>
            
            <div class="detail-row">
              <span class="detail-label">Check-in:</span>
              <span class="detail-value">${checkInDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Check-out:</span>
              <span class="detail-value">${checkOutDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Nights:</span>
              <span class="detail-value">${booking.nights} night${booking.nights !== 1 ? 's' : ''}</span>
            </div>
            
            ${booking.total_amount ? `
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="detail-value">R ${booking.total_amount.toLocaleString()}</span>
            </div>
            ` : ''}
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">
            The indemnity form is attached to this email for your records.
          </p>
          
          <div class="divider"></div>
          
          <!-- 🎁 HIGH-CONVERTING NEWSLETTER BLOCK -->
          <div class="newsletter-block">
            <h2>🎁 Win Your Next Stay With Us</h2>
            <div class="prize">
              ✨ TWO nights for TWO (B&B) + welcome bottle of champagne ✨
            </div>
            
            <p style="color: #4b5563; margin-bottom: 16px;">
              As a valued guest, you're invited to enter our exclusive draw:
            </p>
            
            <ul class="benefits">
              <li>Get exclusive deals and special offers</li>
              <li>Be first to hear about promotions</li>
              <li>Stand a chance to stay with us again — on us</li>
            </ul>
            
            <a href="https://fastcheckin.co.za/subscribe?email=${encodeURIComponent(booking.guest_email)}&business=${encodeURIComponent(businessName)}" class="subscribe-btn">
              📧 Subscribe now (takes 10 seconds)
            </a>
            
            <p style="font-size: 13px; color: #6b7280; margin-top: 12px;">
              💡 Want better odds? Share this with friends and family — they can enter too!
            </p>
            
            <div class="fine-print">
              *T&C's apply. Winner announced in the September newsletter. Draw takes place on 30 October.
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div style="text-align: center;">
            <a href="https://fastcheckin.co.za" class="button">
              View Your Stay
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin-top: 24px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
              💡 <strong>Pro tip:</strong> Save this email for quick access to your stay details.
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p style="margin-bottom: 8px;">
            Need help? Contact us at <a href="mailto:support@fastcheckin.co.za" style="color: #f59e0b;">support@fastcheckin.co.za</a>
          </p>
          <p style="margin: 0;">
            © ${new Date().getFullYear()} FastCheckin. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
