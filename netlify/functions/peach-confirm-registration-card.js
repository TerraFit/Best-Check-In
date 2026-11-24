import crypto from 'node:crypto';
import { Resend } from 'resend';
import { getAppBaseUrl } from './lib/app-base-url.js';
import { getPlanPricing, normalizePlanId } from './lib/packages.js';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const sendApplicationConfirmation = async ({ event, supabaseUrl, serviceKey, business }) => {
  if (!business?.email || !process.env.RESEND_API_KEY) return false;
  if (business.registration_confirmation_sent_at) return true;
  const setupToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(setupToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const tokenResponse = await fetch(`${supabaseUrl}/rest/v1/business_account_setup_tokens`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify([{ token_hash: tokenHash, business_id: business.id, expires_at: expiresAt }])
  });
  if (!tokenResponse.ok) throw new Error('Could not create applicant account setup token');

  const setupUrl = `${getAppBaseUrl(event)}/set-password/${encodeURIComponent(setupToken)}`;
  const businessName = String(business.trading_name || 'your business');
  const plan = String(business.current_plan || business.subscription_tier || 'selected package');
  const billingCycle = String(business.billing_cycle || 'monthly').toLowerCase();
  const isAnnual = billingCycle === 'annual' || billingCycle === 'yearly';
  const billingLabel = isAnnual ? 'Annual billing' : 'Monthly billing';
  const pricing = getPlanPricing(normalizePlanId(plan), isAnnual ? 'yearly' : 'monthly', business.total_rooms);
  const priceLabel = pricing.contactSales
    ? 'Contact FastCheckIn for an Enterprise quotation'
    : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: pricing.currency || 'ZAR' }).format(pricing.amount) + (isAnnual ? ' per year' : ' per month');
  const safe = (value) => value.replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const name = safe(businessName);
  const safePlan = safe(plan.charAt(0).toUpperCase() + plan.slice(1));
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: 'FastCheckIn <noreply@fastcheckin.co.za>',
    to: [business.email],
    subject: 'Your FastCheckIn application has been submitted',
    html: `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#263238"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#172b3a;padding:28px;color:#fff"><h1 style="margin:0;font-size:24px">Application submitted</h1><p style="margin:8px 0 0">Hospitality, connected.</p></td></tr><tr><td style="padding:30px"><p>Hello ${name},</p><p>Thank you. Your FastCheckIn application has been received and your card has been validated successfully. <strong>No amount has been debited.</strong></p><h3>Application review</h3><p>Our team will verify the information and supporting documents you submitted and aims to complete approval within <strong>48 business hours</strong>. You are responsible for ensuring that the information and documents supplied in your application are accurate and complete. FastCheckIn's role is to verify the submitted information.</p><h3>Your subscription</h3><p>Package: <strong>${safePlan}</strong><br>${billingLabel}<br>Subscription fee: <strong>${priceLabel}</strong></p><p>Your card validation authorises the selected subscription for future billing. No subscription amount is taken now. Your <strong>14-day free trial</strong> starts at 00:00 South African time on the day after your application is approved. We will remind you before the free trial ends. You may cancel your subscription at any time.</p><h3>Set up your business dashboard</h3><p>Create your password using the secure link below. You can then sign in and access your business dashboard while your application is under review. Live guest check-in will become available once your application is approved.</p><p style="text-align:center;margin:28px 0"><a href="${setupUrl}" style="background:#c66a20;color:#fff;text-decoration:none;padding:14px 24px;border-radius:7px;font-weight:bold;display:inline-block">Set up your business account</a></p><p style="font-size:12px;color:#687782">This secure setup link expires in 7 days and can only be used once. If it expires, contact FastCheckIn support.</p><p>Once your application is approved, we will email you confirmation and the instructions for getting started with live guest check-in.</p><p>FastCheckIn<br><a href="https://fastcheckin.co.za">fastcheckin.co.za</a></p></td></tr></table></td></tr></table></body></html>`,
    text: `Application submitted — FastCheckIn

Hello ${businessName},

Your application has been received and your card has been validated successfully. No amount has been debited.

APPLICATION REVIEW
Our team will verify the information and supporting documents you submitted and aims to complete approval within 48 business hours. You are responsible for ensuring the information and documents supplied are accurate and complete. FastCheckIn's role is to verify the submitted information.

YOUR SUBSCRIPTION
Package: ${plan}
Billing: ${billingLabel}
Subscription fee: ${priceLabel}
Your card validation authorises the selected subscription for future billing. No amount is taken now. Your 14-day free trial starts at 00:00 South African time on the day after approval. We will remind you before the trial ends. You may cancel at any time.

SET UP YOUR BUSINESS DASHBOARD
Create your password using this one-time secure link:
${setupUrl}

You can sign in and use your business dashboard while the application is under review. Live guest check-in becomes available once approved. This link expires in 7 days.

After approval, we will email confirmation and instructions for starting live guest check-in.

FastCheckIn — https://fastcheckin.co.za`
  });
  if (result?.error) throw new Error(result.error.message || 'Confirmation email was rejected');
  const stamp = new Date().toISOString();
  const audit = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(business.id)}&registration_confirmation_sent_at=is.null`, {
    method: 'PATCH',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ registration_confirmation_sent_at: stamp, updated_at: stamp })
  });
  if (!audit.ok) console.error('[peach-confirm-registration-card] Could not record confirmation email timestamp:', audit.status);
  return true;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { registrationToken } = JSON.parse(event.body || '{}');
    if (typeof registrationToken !== 'string' || registrationToken.length < 32 || registrationToken.length > 128) {
      return reply(400, { error: 'Valid application token is required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const apiKey = process.env.PEACH_ORCHESTRATION_API_KEY;
    const baseUrl = process.env.PEACH_ORCHESTRATION_BASE_URL?.replace(/\/$/, '');
    if (!supabaseUrl || !serviceKey || !apiKey || !baseUrl) return reply(500, { error: 'Registration payment service is not configured' });
    let parsedBaseUrl;
    try { parsedBaseUrl = new URL(baseUrl); } catch { return reply(500, { error: 'Invalid Peach Orchestration base URL' }); }
    if (parsedBaseUrl.protocol !== 'https:' || parsedBaseUrl.pathname !== '/' || !['app.sandbox-next.peachpayments.com', 'app.next.peachpayments.com'].includes(parsedBaseUrl.hostname)) {
      return reply(500, { error: 'Invalid Peach Orchestration base URL' });
    }

    const tokenHash = hashToken(registrationToken);
    const tokenResponse = await fetch(`${supabaseUrl}/rest/v1/registration_application_tokens?token_hash=eq.${tokenHash}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=business_id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    if (!tokenResponse.ok) throw new Error('Application token lookup failed');
    const tokenRows = await tokenResponse.json();
    const businessId = tokenRows?.[0]?.business_id;
    if (!businessId) return reply(404, { error: 'Application not found or expired' });

    const businessResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&status=eq.pending&select=id,trading_name,email,current_plan,subscription_tier,billing_cycle,total_rooms,registration_confirmation_sent_at,registration_payment_intent_id,registration_payment_status,payment_customer_id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    if (!businessResponse.ok) throw new Error('Application lookup failed');
    const business = (await businessResponse.json())?.[0];
    if (!business) return reply(404, { error: 'Pending application not found' });
    if (business.registration_payment_status === 'verified') {
      let confirmationEmailSent = false;
      try { confirmationEmailSent = await sendApplicationConfirmation({ event, supabaseUrl, serviceKey, business }); }
      catch (emailError) { console.error('[peach-confirm-registration-card] Confirmation email could not be sent:', emailError?.message || emailError); }
      return reply(200, { success: true, verified: true, businessName: business.trading_name, email: business.email, confirmationEmailSent });
    }

    const paymentId = business.registration_payment_intent_id;
    if (!paymentId) return reply(409, { error: 'No card validation session exists yet', code: 'no_payment_intent' });

    // Peach may return the shopper without a usable final browser status. Force a
    // server-side synchronisation before deciding whether the mandate is valid.
    const peachResponse = await fetch(`${baseUrl}/api/payments/${encodeURIComponent(paymentId)}?force_sync=true`, {
      headers: { 'api-key': apiKey, Accept: 'application/json' }
    });
    const peach = await peachResponse.json().catch(() => ({}));
    if (!peachResponse.ok) {
      console.error('[peach-confirm-registration-card] Peach lookup failed:', {
        status: peachResponse.status,
        code: peach.error_code || peach.code || null
      });
      return reply(502, { error: 'Could not verify card validation with Peach' });
    }

    const status = String(peach.status || peach.payment_status || '').toLowerCase();
    const mandateId = peach.mandate_id
      || peach.mandate?.id
      || peach.recurring_details?.mandate_id
      || peach.payment_method?.mandate_id
      || peach.connector_mandate_id
      || null;
    const customerId = peach.customer_id || peach.customer?.id || business.payment_customer_id || null;

    if (status !== 'succeeded' || !mandateId || !customerId) {
      const retryable = ['failed', 'cancelled', 'requires_payment_method'].includes(status);
      let redirectUrl = null;
      const candidateRedirect = peach.next_action?.type === 'redirect_to_url'
        ? peach.next_action.redirect_to_url
        : null;
      if (candidateRedirect) {
        try {
          const parsedRedirect = new URL(candidateRedirect);
          if (parsedRedirect.protocol === 'https:' && parsedRedirect.hostname === parsedBaseUrl.hostname) {
            redirectUrl = candidateRedirect;
          }
        } catch { /* Ignore malformed provider redirect URLs. */ }
      }
      return reply(202, {
        success: false,
        verified: false,
        peachStatus: status || 'unknown',
        retryable,
        redirectUrl,
        message: retryable
          ? 'The previous card attempt was not completed. You can safely try card validation again.'
          : redirectUrl
            ? 'Your bank requires one more secure verification step. Redirecting you to Peach…'
            : 'Peach is still confirming your card. Please wait a moment and check again.'
      });
    }

    const now = new Date().toISOString();
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&status=eq.pending&registration_payment_intent_id=eq.${encodeURIComponent(paymentId)}`, {
      method: 'PATCH',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        payment_provider: 'peach',
        payment_customer_id: customerId,
        payment_mandate_id: mandateId,
        payment_method: 'card',
        payment_status: 'authorized',
        registration_payment_status: 'verified',
        registration_card_verified_at: now,
        updated_at: now
      })
    });
    if (!updateResponse.ok) throw new Error(`Could not save verified mandate (${updateResponse.status})`);
    const updated = await updateResponse.json();
    if (!Array.isArray(updated) || updated.length !== 1) return reply(409, { error: 'Application changed before card validation could be recorded' });
    let confirmationEmailSent = false;
    try { confirmationEmailSent = await sendApplicationConfirmation({ event, supabaseUrl, serviceKey, business: { ...business, registration_confirmation_sent_at: null } }); }
    catch (emailError) { console.error('[peach-confirm-registration-card] Confirmation email could not be sent:', emailError?.message || emailError); }
    return reply(200, { success: true, verified: true, businessName: business.trading_name, email: business.email, confirmationEmailSent, message: 'Card validated. No payment has been taken.' });
  } catch (error) {
    console.error('[peach-confirm-registration-card] Error:', error?.message || error);
    return reply(500, { error: 'Could not confirm card validation' });
  }
};
