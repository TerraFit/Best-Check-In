import crypto from 'node:crypto';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { registrationToken } = JSON.parse(event.body || '{}');
    if (typeof registrationToken !== 'string' || registrationToken.length < 32 || registrationToken.length > 128) return reply(400, { error: 'Valid application token is required' });

    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const apiKey = process.env.PEACH_ORCHESTRATION_API_KEY;
    const baseUrl = process.env.PEACH_ORCHESTRATION_BASE_URL?.replace(/\/$/, '');
    if (!supabaseUrl || !serviceKey || !apiKey || !baseUrl) return reply(500, { error: 'Registration payment service is not configured' });
    if (!['https://app.sandbox-next.peachpayments.com', 'https://app.next.peachpayments.com'].includes(baseUrl)) return reply(500, { error: 'Invalid Peach Orchestration base URL' });

    const tokenHash = hashToken(registrationToken);
    const tokenResponse = await fetch(`${supabaseUrl}/rest/v1/registration_application_tokens?token_hash=eq.${tokenHash}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=business_id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    if (!tokenResponse.ok) throw new Error('Application token lookup failed');
    const tokenRows = await tokenResponse.json();
    const businessId = tokenRows?.[0]?.business_id;
    if (!businessId) return reply(404, { error: 'Application not found or expired' });

    const businessResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&status=eq.pending&select=id,registration_payment_intent_id,registration_payment_status,payment_customer_id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    if (!businessResponse.ok) throw new Error('Application lookup failed');
    const businesses = await businessResponse.json();
    const business = businesses?.[0];
    if (!business) return reply(404, { error: 'Pending application not found' });
    if (business.registration_payment_status === 'verified') return reply(200, { success: true, verified: true });

    const paymentId = business.registration_payment_intent_id;
    if (!paymentId) return reply(409, { error: 'No card validation session exists yet' });
    const peachResponse = await fetch(`${baseUrl}/api/payments/${encodeURIComponent(paymentId)}`, {
      headers: { 'api-key': apiKey, Accept: 'application/json' }
    });
    const peach = await peachResponse.json().catch(() => ({}));
    if (!peachResponse.ok) {
      console.error('[peach-confirm-registration-card] Peach lookup failed:', peach);
      return reply(502, { error: 'Could not verify card validation with Peach' });
    }

    const status = String(peach.status || peach.payment_status || '').toLowerCase();
    const mandateId = peach.mandate_id || peach.mandateId || peach.recurring_details?.mandate_id || peach.connector_mandate_id || null;
    const customerId = peach.customer_id || peach.customer?.id || business.payment_customer_id || null;
    if (!['succeeded', 'success', 'completed'].includes(status) || !mandateId || !customerId) {
      return reply(202, { success: false, verified: false, message: 'Card validation is not yet confirmed. Please wait a moment and try again.' });
    }

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
        registration_card_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    if (!updateResponse.ok) throw new Error(`Could not save verified mandate (${updateResponse.status})`);
    const updated = await updateResponse.json();
    if (!Array.isArray(updated) || updated.length !== 1) return reply(409, { error: 'Application changed before card validation could be recorded' });
    return reply(200, { success: true, verified: true, message: 'Card validated. No payment has been taken.' });
  } catch (error) {
    console.error('[peach-confirm-registration-card] Error:', error?.message || error);
    return reply(500, { error: 'Could not confirm card validation' });
  }
};
