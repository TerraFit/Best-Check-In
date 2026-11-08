import crypto from 'node:crypto';
import { getPlanPricing, normalizePlanId } from './lib/packages.js';
import { getAppBaseUrl } from './lib/app-base-url.js';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  const apiKey = process.env.PEACH_ORCHESTRATION_API_KEY;
  const profileId = process.env.PEACH_PROFILE_ID;
  const baseUrl = process.env.PEACH_ORCHESTRATION_BASE_URL?.replace(/\/$/, '');
  const sdkUrl = process.env.PEACH_ORCHESTRATION_SDK_URL;
  if (!url || !key || !apiKey || !profileId || !baseUrl || !sdkUrl) throw new Error('Registration payment service is not configured');
  let parsedBaseUrl;
  try { parsedBaseUrl = new URL(baseUrl); } catch { throw new Error('Invalid Peach Orchestration base URL'); }
  if (parsedBaseUrl.protocol !== 'https:' || parsedBaseUrl.pathname !== '/' || !['app.sandbox-next.peachpayments.com', 'app.next.peachpayments.com'].includes(parsedBaseUrl.hostname)) throw new Error('Invalid Peach Orchestration base URL');
  if (!sdkUrl.startsWith('https://sdk.') || !sdkUrl.includes('.peachpayments.com/')) throw new Error('Invalid Peach SDK URL');
  return { url, key, apiKey, profileId, baseUrl, sdkUrl };
}

async function loadApplication(token) {
  const { url, key } = config();
  const hash = hashToken(token);
  const tokenResponse = await fetch(`${url}/rest/v1/registration_application_tokens?token_hash=eq.${hash}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=business_id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!tokenResponse.ok) throw new Error('Could not validate application');
  const tokens = await tokenResponse.json();
  const businessId = tokens?.[0]?.business_id;
  if (!businessId) return null;
  const businessResponse = await fetch(`${url}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=id,trading_name,email,phone,current_plan,billing_cycle,total_rooms,status,registration_payment_status,registration_payment_intent_id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!businessResponse.ok) throw new Error('Could not load application');
  const businesses = await businessResponse.json();
  return businesses?.[0] || null;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { registrationToken } = JSON.parse(event.body || '{}');
    if (typeof registrationToken !== 'string' || registrationToken.length < 32 || registrationToken.length > 128) return reply(400, { error: 'Valid application token is required' });
    const business = await loadApplication(registrationToken);
    if (!business || business.status !== 'pending') return reply(404, { error: 'Application not found or expired' });
    if (business.registration_payment_status === 'verified') return reply(409, { error: 'Card validation is already complete' });

    const { url, key, apiKey, profileId, baseUrl, sdkUrl } = config();
    const plan = normalizePlanId(business.current_plan);
    const pricing = getPlanPricing(plan, business.billing_cycle || 'monthly', business.total_rooms);
    const customerId = `fc_${business.id}`;
    const acceptedAt = new Date().toISOString();
    const amountLimit = Math.ceil(Number(pricing.amount || 0) * 1.3 * 100);
    if (!Number.isFinite(amountLimit) || amountLimit <= 0) return reply(400, { error: 'Selected subscription pricing is invalid' });

    const peachResponse = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_id: profileId,
        amount: 0,
        currency: pricing.currency || 'ZAR',
        confirm: false,
        capture_method: 'automatic',
        authentication_type: 'three_ds',
        setup_future_usage: 'off_session',
        description: `FastCheckIn ${plan} registration card validation (no charge)`,
        customer: { id: customerId, email: business.email, name: business.trading_name, phone: business.phone || undefined },
        mandate_data: {
          customer_acceptance: {
            acceptance_type: 'online',
            accepted_at: acceptedAt,
            online: {
              ip_address: event.requestContext?.identity?.sourceIp || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || '0.0.0.0',
              user_agent: event.headers?.['user-agent'] || event.headers?.['User-Agent'] || 'FastCheckIn'
            }
          },
          mandate_type: { multi_use: { amount: amountLimit, currency: pricing.currency || 'ZAR' } }
        },
        metadata: { business_id: business.id, purpose: 'fastcheckin_registration_card_mandate', plan_id: plan, billing_cycle: business.billing_cycle || 'monthly' },
        return_url: `${getAppBaseUrl(event)}/registration-payment?token=${encodeURIComponent(registrationToken)}`,
        is_iframe_redirection_enabled: true
      })
    });
    const responseContentType = peachResponse.headers.get('content-type') || 'unknown';
    const responseRequestId = peachResponse.headers.get('x-request-id')
      || peachResponse.headers.get('request-id')
      || peachResponse.headers.get('trace-id')
      || null;
    const responseText = await peachResponse.text();
    let peach = {};
    let responseFormat = 'non_json';
    try {
      peach = responseText ? JSON.parse(responseText) : {};
      responseFormat = 'json';
    } catch {
      // Do not return or log raw upstream response bodies.
    }

    const safeDiagnosticText = (value) => {
      if (typeof value !== 'string') return null;
      return value
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
        .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
        .replace(/(?:registrationToken|token)=([^&\s]+)/gi, '$1=[redacted]')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 240) || null;
    };
    const peachErrorCode = safeDiagnosticText(
      peach.error_code || peach.code || peach.error?.code || peach.type
    );
    const peachErrorMessage = safeDiagnosticText(
      peach.error_message || peach.message || peach.error?.message || peach.error_description
    );

    if (!peachResponse.ok) {
      const diagnostic = {
        provider: 'Peach',
        httpStatus: peachResponse.status,
        httpStatusText: peachResponse.statusText || null,
        responseContentType,
        responseFormat,
        requestId: responseRequestId,
        errorCode: peachErrorCode
      };
      console.error('[peach-registration-card-intent] Peach API rejected request:', diagnostic);
      return reply(502, {
        error: 'Peach could not start card validation',
        diagnostic: {
          ...diagnostic,
          message: peachErrorMessage
        }
      });
    }
    const paymentId = peach.id || peach.payment_id;
    const clientSecret = peach.client_secret || peach.clientSecret;
    if (!paymentId || !clientSecret) return reply(502, { error: 'Peach returned an incomplete card validation session' });

    const update = await fetch(`${url}/rest/v1/businesses?id=eq.${encodeURIComponent(business.id)}&status=eq.pending`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ payment_provider: 'peach', payment_customer_id: customerId, registration_payment_intent_id: paymentId, registration_payment_status: 'intent_created', payment_status: 'pending', updated_at: new Date().toISOString() })
    });
    if (!update.ok) {
      console.error('[peach-registration-card-intent] Failed to persist intent:', await update.text());
      return reply(500, { error: 'Could not save card validation session' });
    }
    return reply(200, { success: true, clientSecret, paymentId, publishableKey: process.env.PEACH_PUBLISHABLE_KEY || null, baseUrl, sdkUrl });
  } catch (error) {
    console.error('[peach-registration-card-intent] Error:', error?.message || error);
    return reply(500, { error: 'Could not start card validation' });
  }
};
