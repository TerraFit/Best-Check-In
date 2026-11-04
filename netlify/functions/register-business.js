import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import { Resend } from 'resend';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const generateWelcomeEmail = (businessName, setupLink) => {
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
        .button {
          display: inline-block;
          background: #f59e0b;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin: 20px 0;
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
          <p style="color: #555;">Thank you for registering with FastCheckin. Your application has been received and is pending approval.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 16px; margin: 30px 0;">
            <p style="margin: 0 0 10px 0;"><strong>What happens next?</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Our team will review your application within 24-48 hours</li>
              <li>You'll receive an approval email once verified</li>
              <li>After approval, use the link below to set up your password</li>
            </ul>
          </div>
          <div style="text-align: center;">
            <a href="${setupLink}" class="button">Complete Registration</a>
          </div>
          <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px;">
            This link expires in 48 hours after approval.
          </p>
        </div>
        <div class="footer">
          <p>FastCheckin - Seamless Check-in, Smarter Stay</p>
          <p><a href="https://fastcheckin.co.za" style="color: #f59e0b;">www.fastcheckin.co.za</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ============================================================
// MAIN HANDLER
// ============================================================

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    // Parse request body
    const { business } = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!business || !business.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // ============================================================
    // CHECK IF BUSINESS ALREADY EXISTS (REST)
    // ============================================================
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?email=eq.${encodeURIComponent(business.email)}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const existingBusinesses = await checkResponse.json();
    
    if (existingBusinesses && existingBusinesses.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email already registered' })
      };
    }

    // ============================================================
    // GENERATE IDs AND TOKENS
    // ============================================================
    const businessId = uuidv4();
    const registrationToken = uuidv4();
    const registrationTokenHash = crypto.createHash('sha256').update(registrationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // ============================================================
    // CREATE PHYSICAL ADDRESS
    // ============================================================
    const physicalAddress = business.physical_address || {
      street: business.physicalStreet || '',
      city: business.physicalCity || '',
      province: business.physicalProvince || '',
      country: business.physicalCountry || 'South Africa',
      postalCode: business.physicalPostalCode || ''
    };

    // ============================================================
    // CREATE DIRECTORS ARRAY
    // ============================================================
    const directors = [];
    if (business.director) {
      const directorObj = {
        name: `${business.director.name || ''} ${business.director.surname || ''}`.trim(),
        id_number: business.director.id_number || '',
        id_photo_url: business.director.id_photo || '',
        email: business.director.email || business.email,
        phone: business.director.mobile_phone || business.mobile_phone
      };
      if (business.director.address) {
        directorObj.address = business.director.address;
      }
      directors.push(directorObj);
    }

    // ============================================================
    // CREATE BUSINESS RECORD (REST)
    // ============================================================
    const businessData = {
      id: businessId,
      business_number: `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      registered_name: business.legal_name || business.trading_name,
      legal_name: business.legal_name || business.trading_name,
      trading_name: business.trading_name,
      registration_number: business.registration_number || '',
      vat_number: business.vat_number || '',
      establishment_type: business.establishment_type || '',
      tgsa_grading: business.tgsa_grading || 'NA',
      email: business.email,
      phone: business.mobile_phone,
      fixed_phone: business.fixed_phone || '',
      website: business.website || '',
      physical_address: physicalAddress,
      postal_address: business.postal_address || physicalAddress,
      directors: directors,
      total_rooms: business.total_rooms || 0,
      avg_price: 0,
      subscription_tier: business.plan || 'starter',
      current_plan: business.plan || 'starter',
      max_rooms: business.max_rooms || 10,
      billing_cycle: business.billing_cycle || 'monthly',
      payment_method: 'pending',
      payment_status: 'pending',
      registration_payment_status: 'pending_card',
      registration_payment_intent_id: null,
      registration_card_verified_at: null,
      status: 'pending',
      password_hash: null,
      subscription_status: 'pending_approval',
      trial_start: null,
      trial_end: null,
      trial_scheduled_start: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Creating business record:', businessData.trading_name);

    const createResponse = await fetch(`${supabaseUrl}/rest/v1/businesses`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([businessData])
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Business insert error:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create business record' })
      };
    }

    console.log('✅ Business record created:', businessId);

    // Save only a hash of the short-lived applicant token. The token
    // authorizes card setup and application follow-up, never dashboard access.
    const tokenResponse = await fetch(`${supabaseUrl}/rest/v1/registration_application_tokens`, {
      method: 'POST',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify([{ token_hash: registrationTokenHash, business_id: businessId, expires_at: tokenExpiry.toISOString() }])
    });

    if (!tokenResponse.ok) {
      console.error('Registration token save error:', await tokenResponse.text());
      await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}`, {
        method: 'DELETE', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      }).catch(() => undefined);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not prepare secure card setup. Please try again.' }) };
    }

    let applicationEmailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const appUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://fastcheckin.co.za';
        const cardSetupLink = `${appUrl.replace(/\/$/, '')}/registration-payment?token=${encodeURIComponent(registrationToken)}`;
        await resend.emails.send({
          from: 'FastCheckin <noreply@fastcheckin.co.za>',
          to: [business.email],
          subject: `Complete your FastCheckIn application — ${business.trading_name}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:32px auto;padding:28px;color:#292524"><h1 style="color:#d97706">FastCheckIn</h1><h2>One more step to submit your application</h2><p>Thank you for applying for <strong>${business.trading_name}</strong>.</p><p>Before our team can review your application, please validate your card and authorise future recurring subscription payments through Peach Payments.</p><p><strong>No payment is taken now.</strong> Your 14-day free trial starts only on the day after your application is approved.</p><p style="margin:28px 0"><a href="${cardSetupLink}" style="background:#ea580c;color:#fff;padding:13px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Continue secure card validation</a></p><p style="font-size:12px;color:#78716c">This secure link expires in 48 hours. If you did not submit this application, you can ignore this email.</p></div>`
        });
        applicationEmailSent = true;
      } catch (emailError) {
        console.error('Registration continuation email failed:', emailError?.message || emailError);
      }
    }

    // ============================================================
    // RETURN SUCCESS RESPONSE
    // ============================================================
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        businessId: businessId,
        registrationToken,
        applicationEmailSent,
        message: 'Application created. Complete card validation to submit it for review.'
      })
    };

  } catch (error) {
    console.error('🔥 Registration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack
      })
    };
  }
};
