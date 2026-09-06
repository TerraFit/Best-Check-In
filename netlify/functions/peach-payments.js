import { createClient } from '@supabase/supabase-js';
import { getPackage, getPlanPricing, normalizePlanId } from './lib/packages.js';
import auth from './_auth.cjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PEACH_API_KEY = process.env.PEACH_API_KEY;
const PEACH_ENTITY_ID = process.env.PEACH_ENTITY_ID;
const PEACH_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.peachpayments.com/v1/payments'
  : 'https://testapi.peachpayments.com/v1/payments';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  return createPeachPayment(event);
};

async function createPeachPayment(event) {
  try {
    const gate = auth.requireBusinessActor(event);
    if (!gate.ok || gate.principal.actorType !== 'business') {
      return auth.authFailure(gate, jsonHeaders);
    }

    const body = JSON.parse(event.body || '{}');
    const businessId = body.businessId;
    const requestedPlanId = body.planId;
    const billingCycle = body.billingCycle;

    const scope = auth.resolveTenant(gate.principal, businessId);
    if (!scope.ok) return auth.authFailure(scope, jsonHeaders);

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid billing cycle' }) };
    }

    const planId = normalizePlanId(requestedPlanId);
    const pkg = getPackage(planId);
    const pricing = getPlanPricing(planId, billingCycle);
    if (!pkg || pricing.contactSales || pricing.amount <= 0) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Selected plan is not available for online payment' }) };
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, email, trading_name, status')
      .eq('id', scope.businessId)
      .single();

    if (businessError || !business || business.status !== 'approved') {
      return { statusCode: 403, headers: jsonHeaders, body: JSON.stringify({ error: 'Business account is not eligible for payment' }) };
    }

    const transactionId = `PP-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const authoritativeAmount = pricing.amount;
    const customerEmail = gate.principal.email || business.email;

    const { error: transactionError } = await supabase.from('transactions').insert({
      id: transactionId,
      business_id: scope.businessId,
      plan_id: planId,
      billing_cycle: billingCycle,
      amount: authoritativeAmount,
      status: 'pending',
      gateway: 'peach',
      created_at: new Date().toISOString()
    });

    if (transactionError) throw transactionError;

    const response = await fetch(PEACH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PEACH_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        entityId: PEACH_ENTITY_ID,
        amount: authoritativeAmount.toString(),
        currency: pricing.currency,
        paymentType: 'DB',
        merchantTransactionId: transactionId,
        customerEmail,
        returnUrl: 'https://fastcheckin.co.za/business/billing?gateway=peach',
        shopperResultUrl: 'https://fastcheckin.co.za/.netlify/functions/peach-payments/result'
      })
    });

    if (!response.ok) {
      const upstream = await response.text();
      console.error('Peach payment request failed:', response.status, upstream);
      throw new Error('Peach payment request failed');
    }

    const result = await response.json();
    if (!result.redirect?.url) throw new Error('Peach payment did not return a redirect URL');

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        redirectUrl: result.redirect.url,
        transactionId
      })
    };
  } catch (error) {
    console.error('Peach payment error:', error);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Payment could not be created' })
    };
  }
}
