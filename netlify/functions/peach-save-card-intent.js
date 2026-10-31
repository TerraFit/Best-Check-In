import auth from './_auth.cjs';
import { getPlanPricing, normalizePlanId } from './lib/packages.js';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const response = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  const gate = auth.requireBusinessActor(event);
  if (!gate.ok) return auth.authFailure(gate, headers);

  try {
    const body = JSON.parse(event.body || '{}');
    const scope = auth.resolveTenant(gate.principal, body.businessId);
    if (!scope.ok) return auth.authFailure(scope, headers);

    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const apiKey = process.env.PEACH_ORCHESTRATION_API_KEY;
    const profileId = process.env.PEACH_PROFILE_ID;
    if (!supabaseUrl || !serviceKey || !apiKey || !profileId) return response(500, { error: 'Payment service is not configured' });

    const businessResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(scope.businessId)}&select=id,trading_name,email,phone,current_plan,billing_cycle,total_rooms,trial_end,subscription_status&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!businessResponse.ok) return response(500, { error: 'Could not load business' });
    const businesses = await businessResponse.json();
    const business = businesses?.[0];
    if (!business) return response(404, { error: 'Business not found' });
    if (!['trial', 'trialing'].includes(business.subscription_status)) return response(400, { error: 'A card mandate can only be created for an active trial' });

    const pricing = getPlanPricing(normalizePlanId(business.current_plan), business.billing_cycle || 'monthly', business.total_rooms);
    const highestCharge = Math.ceil(Number(pricing.amount || 0) * 1.3 * 100);
    const customerId = `fc_${business.id}`;
    const acceptedAt = new Date().toISOString();

    const peachResponse = await fetch('https://app.next.peachpayments.com/api/payments', {
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
        description: `FastCheckIn ${normalizePlanId(business.current_plan)} free-trial card validation`,
        customer: {
          id: customerId,
          email: business.email,
          name: business.trading_name,
          phone: business.phone || undefined,
        },
        mandate_data: {
          customer_acceptance: {
            acceptance_type: 'online',
            accepted_at: acceptedAt,
            online: {
              ip_address: event.requestContext?.identity?.sourceIp || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || '0.0.0.0',
              user_agent: event.headers?.['user-agent'] || event.headers?.['User-Agent'] || 'FastCheckIn',
            },
          },
          mandate_type: {
            multi_use: {
              amount: highestCharge,
              currency: pricing.currency || 'ZAR',
            },
          },
        },
        metadata: {
          business_id: business.id,
          plan_id: normalizePlanId(business.current_plan),
          billing_cycle: business.billing_cycle || 'monthly',
          trial_end: business.trial_end,
          purpose: 'fastcheckin_trial_card_mandate',
        },
        return_url: 'https://fastcheckin.co.za/business/billing?peach=trial-card',
        is_iframe_redirection_enabled: true,
      }),
    });

    const peach = await peachResponse.json().catch(() => ({}));
    if (!peachResponse.ok) {
      console.error('[peach-save-card-intent] Peach error:', peach);
      return response(502, { error: peach.error_message || 'Peach could not create the card validation intent' });
    }

    await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(scope.businessId)}`, {
      method: 'PATCH',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ payment_provider: 'peach', payment_customer_id: customerId, payment_status: 'pending', updated_at: new Date().toISOString() }),
    });

    return response(200, {
      success: true,
      clientSecret: peach.client_secret || peach.clientSecret || null,
      paymentId: peach.id || peach.payment_id || null,
      nextAction: peach.next_action || null,
      publishableKey: process.env.PEACH_PUBLISHABLE_KEY || null,
    });
  } catch (error) {
    console.error('[peach-save-card-intent] Error:', error?.message || error);
    return response(500, { error: 'Could not start card validation' });
  }
};
