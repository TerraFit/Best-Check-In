// netlify/functions/send-confirmation-email.ts - COMPLETE REST MIGRATION

import type { Handler } from '@netlify/functions';

interface BookingData {
  guest_name: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  business_name?: string;
  business_logo?: string;
  total_amount?: number;
  business_id?: string;
  indemnity_token?: string;
  marketing_consent?: boolean;
}

export const handler: Handler = async (event) => {
  console.log('📧 Email function triggered', new Date().toISOString());

  // Always return 200 - email is non-critical
  try {
    if (!event.body) {
      console.warn('No booking data provided');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          warning: 'No booking data',
          email_sent: false 
        })
      };
    }

    const booking: BookingData = JSON.parse(event.body);
    console.log('📧 Sending email to:', booking.guest_email);

    let newsletterSettings = null;
    if (booking.business_id) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/businesses?id=eq.${booking.business_id}&select=newsletter_enabled,newsletter_title,newsletter_prize,newsletter_cta,newsletter_terms,newsletter_draw_date,newsletter_share_text,trading_name`,
            {
              method: 'GET',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            newsletterSettings = data && data[0] ? data[0] : null;
            console.log('📧 Newsletter settings fetched');
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch newsletter settings:', err);
        // Continue without newsletter
      }
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          warning: 'Email service not configured',
          email_sent: false
        })
      };
    }

    const emailHtml = generateEmailTemplate(booking, newsletterSettings);
    
    const fromEmail = newsletterSettings?.trading_name 
      ? `${newsletterSettings.trading_name.replace(/[^a-zA-Z0-9]/g, '')} <checkin@fastcheckin.co.za>`
      : 'FastCheckin <checkin@fastcheckin.co.za>';

    console.log('📧 Sending email via Resend...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [booking.guest_email],
        subject: `✅ Check-in Confirmed: ${booking.business_name || 'Your Stay'}`,
        html: emailHtml,
        reply_to: 'support@fastcheckin.co.za'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Resend API error:', result);
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          warning: `Email sending failed: ${result.message || 'Unknown error'}`,
          email_sent: false
        })
      };
    }

    console.log('✅ Email sent successfully:', result.id);

    // Add to newsletter if consented (using REST)
    if (booking.marketing_consent === true && booking.guest_email && booking.business_id) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const subscribeResponse = await fetch(`${supabaseUrl}/rest/v1/newsletter_subscribers`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              business_id: booking.business_id,
              email: booking.guest_email.toLowerCase().trim(),
              guest_name: booking.guest_name,
              source: 'check-in_consent',
              created_at: new Date().toISOString()
            })
          });
          
          if (subscribeResponse.ok) {
            console.log('✅ Added to newsletter subscribers');
          } else {
            console.warn('⚠️ Failed to add to newsletter:', await subscribeResponse.text());
          }
        }
      } catch (err) {
        console.error('❌ Error adding to newsletter:', err);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        id: result.id,
        email_sent: true,
        message: 'Confirmation email sent successfully'
      })
    };

  } catch (error) {
    console.error('❌ Email function error:', error);
    // ALWAYS return 200 - never block the check-in
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        warning: 'Email could not be sent, but check-in completed',
        email_sent: false
      })
    };
  }
};