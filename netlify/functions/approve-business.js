import { Resend } from 'resend';
import QRCode from 'qrcode';
import { getAppBaseUrl } from './lib/app-base-url.js';
import superAdminAuth from './_superAdminAuth.cjs';

const { requireSuperAdmin, authFailure } = superAdminAuth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = requireSuperAdmin(event);
  if (!auth.ok) return authFailure(auth, headers);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  try {
    let businessId;
    try {
      const body = JSON.parse(event.body || '{}');
      businessId = body.businessId;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }

    if (!businessId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID is required' }) };

    console.log(`📝 Processing approval for business ID: ${businessId}`);
    const encodedBusinessId = encodeURIComponent(String(businessId));

    const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodedBusinessId}&select=id,trading_name,email,status,registration_payment_status,payment_mandate_id`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error('Business validation failed:', fetchResponse.status, errorText);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to validate business' }) };
    }

    let businesses;
    try {
      businesses = await fetchResponse.json();
    } catch (jsonError) {
      console.error('Business validation response was not valid JSON:', jsonError?.message || jsonError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to validate business' }) };
    }

    const business = businesses?.[0];
    if (!business) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };
    if (business.status === 'approved') return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business is already approved' }) };
    if (business.status !== 'pending') return { statusCode: 400, headers, body: JSON.stringify({ error: `Business cannot be approved from status: ${business.status}` }) };
    if (business.registration_payment_status !== 'verified' || !business.payment_mandate_id) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'The applicant must complete Peach card validation before approval.' }) };
    }

    const reviewResponse = await fetch(`${supabaseUrl}/rest/v1/business_application_review_requests?business_id=eq.${encodedBusinessId}&status=eq.awaiting_applicant&select=id&limit=1`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    if (!reviewResponse.ok) {
      console.error('Could not verify outstanding review requests:', reviewResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not verify application review status' }) };
    }
    const outstandingRequests = await reviewResponse.json();
    if (outstandingRequests?.length) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'The applicant must respond to all outstanding information requests before approval.' }) };
    }

    console.log(`✅ Business found: ${business.trading_name} (${business.email})`);

    const approvalTime = new Date();
    const localParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(approvalTime);
    const datePart = (type) => Number(localParts.find((part) => part.type === type)?.value);
    const trialStart = new Date(Date.UTC(datePart('year'), datePart('month') - 1, datePart('day') + 1, 0, 0, 0) - (2 * 60 * 60 * 1000));
    const trialEnd = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    const now = approvalTime.toISOString();
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodedBusinessId}`, {
      method: 'PATCH',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: 'approved', approved_at: now, subscription_status: 'trial', trial_scheduled_start: trialStart.toISOString(), trial_start: trialStart.toISOString(), trial_end: trialEnd.toISOString(), updated_at: now })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Error updating business status:', updateResponse.status, errorText);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to approve business' }) };
    }

    let updatedData;
    try {
      updatedData = await updateResponse.json();
    } catch (jsonError) {
      console.error('Business update response was not valid JSON:', jsonError?.message || jsonError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to finalize business approval' }) };
    }

    const updatedBusiness = updatedData?.[0];
    if (!updatedBusiness) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to finalize business approval' }) };

    console.log(`✅ Business status updated to approved for: ${business.trading_name}`);

    const appBaseUrl = getAppBaseUrl(event);
    const checkInUrl = `${appBaseUrl}/checkin/${business.id}`;
    let qrCodeDataUrl = null;
    let qrBuffer = null;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, { width: 400, margin: 2, color: { dark: '#f59e0b', light: '#ffffff' }, errorCorrectionLevel: 'H' });
      qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      console.log('✅ QR code generated successfully');
    } catch (qrError) {
      console.error('⚠️ Error generating QR code (non-critical):', qrError);
    }

    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailResult = await resend.emails.send({
          from: 'FastCheckin <welcome@fastcheckin.co.za>',
          to: [business.email],
          subject: `Your FastCheckIn application has been approved`,
          html: generateWelcomeEmail(business.trading_name, checkInUrl, qrCodeDataUrl, trialStart, trialEnd, appBaseUrl),
          attachments: qrBuffer ? [{ filename: `${business.trading_name.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`, content: qrBuffer.toString('base64'), encoding: 'base64', contentType: 'image/png' }] : undefined
        });
        console.log('✅ Welcome email sent successfully:', emailResult.id);
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    } else {
      console.warn('RESEND_API_KEY not configured - email not sent');
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Business approved successfully', business: { id: updatedBusiness.id, trading_name: updatedBusiness.trading_name, email: updatedBusiness.email, status: updatedBusiness.status, trialStart: trialStart.toISOString(), trialEnd: trialEnd.toISOString() }, checkInUrl, qrCode: qrCodeDataUrl, emailSent }) };
  } catch (error) {
    console.error('Unhandled error in approve-business function:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

function generateWelcomeEmail(businessName, checkInUrl, qrCodeDataUrl, trialStart, trialEnd, appBaseUrl) {
  const dateOptions = { timeZone: 'Africa/Johannesburg', dateStyle: 'long', timeStyle: 'short' };
  const trialStartLabel = new Intl.DateTimeFormat('en-ZA', dateOptions).format(new Date(trialStart));
  const trialEndLabel = new Intl.DateTimeFormat('en-ZA', dateOptions).format(new Date(trialEnd));
  const loginUrl = `${appBaseUrl}/business/login`;
  return `
    <!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FastCheckIn application approved</title>
    <style>body{font-family:Arial,sans-serif;background:#f5f5f5;color:#263238;line-height:1.6;margin:0;padding:24px}.container{max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden}.header{background:#172b3a;color:#fff;padding:28px}.content{padding:30px}.button{display:inline-block;background:#c66a20;color:#fff;padding:14px 24px;text-decoration:none;border-radius:7px;font-weight:bold}.qr-box{background:#f3f4f6;padding:24px;border-radius:12px;text-align:center;margin:24px 0}.qr-box img{max-width:200px}.muted{font-size:12px;color:#687782}</style></head>
    <body><div class="container"><div class="header"><h1 style="margin:0">Your application is approved!</h1><p style="margin:6px 0 0">Hospitality, connected.</p></div><div class="content">
    <p>Hello ${businessName},</p><p>Good news — your FastCheckIn application has been approved. Your business dashboard is ready. Sign in using the email address and password you created during account setup.</p>
    <p><strong>Your 14-day free trial</strong><br>Starts: ${trialStartLabel} (South African time)<br>Trial ends: ${trialEndLabel} (South African time)</p>
    <p>No subscription amount was taken during registration. We will remind you before your free trial ends, and you may cancel your subscription at any time.</p>
    <p style="text-align:center;margin:26px 0"><a class="button" href="${loginUrl}">Open your business dashboard</a></p>
    <div class="qr-box">${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="Guest check-in QR code">`  : '<p>Your QR code is available in your dashboard.</p>'}<p><strong>Guest check-in is now enabled</strong></p><p style="font-size:13px;word-break:break-all">${checkInUrl}</p></div>
    <p>From your dashboard, you can customise your guest check-in page, download your QR code and manage your property.</p>
    <p class="muted">If you have not yet completed account setup, use the secure account setup link in your application confirmation email or contact FastCheckIn support.</p>
    <p>FastCheckIn · <a href="https://fastcheckin.co.za">fastcheckin.co.za</a></p></div></div></body></html>`;
}
