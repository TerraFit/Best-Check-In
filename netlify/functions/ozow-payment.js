import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getPackage, getPlanPricing, normalizePlanId } from './lib/packages.js';
import auth from './_auth.cjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const OZOW_SITE_CODE = process.env.OZOW_SITE_CODE;
const OZOW_API_KEY = process.env.OZOW_API_KEY;
const OZOW_PRIVATE_KEY = process.env.OZOW_PRIVATE_KEY;
const OZOW_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.ozow.com/request/payment'
  : 'https://sandbox.ozow.com/request/payment';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: jsonHeaders, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  return createOzowPayment(event);
};

async function createOzowPayment(event) {
  try {
    const gate = auth.requireBusinessActor(event);
    if (!gate.ok || gate.principal.actorType !== 'business') return auth.authFailure(gate, jsonHeaders);

    const body = JSON.parse(event.body || '{}');
    const businessId = body.businessId;
    const requestedPlanId = body.planId;
    const billingCycle = body.billingCycle;
    const scope = auth.resolveTenant(gate.principal, businessId);
    if (!scope.ok) return auth.authFailure(scope, jsonHeaders);
    if (!['monthly', 'yearly'].includes(billingCycle)) return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid billing cycle' }) };

    const planId = normalizePlanId(requestedPlanId);
    const pkg = getPackage(planId);
    const pricing = getPlanPricing(planId, billingCycle);
    if (!pkg || pricing.contactSales || pricing.amount <= 0) return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Selected plan is not available for online payment' }) };

    const { data: business, error: businessError } = await supabase.from('businesses').select('id, email, status').eq('id', scope.businessId).single();
    if (businessError || !business || business.status !== 'approved') return { statusCode: 403, headers: jsonHeaders, body: JSON.stringify({ error: 'Business account is not eligible for payment' }) };

    const transactionId = `OZ-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const authoritativeAmount = pricing.amount;
    const customerEmail = gate.principal.email || business.email;
    const { error: transactionError } = await supabase.from('transactions').insert({ id: transactionId, business_id: scope.businessId, plan_id: planId, billing_cycle: billingCycle, amount: authoritativeAmount, status: 'pending', gateway: 'ozow', created_at: new Date().toISOString() });
    if (transactionError) throw transactionError;

    const ozowData = {
      SiteCode: OZOW_SITE_CODE,
      TransactionReference: transactionId,
      Amount: authoritativeAmount,
      CurrencyCode: pricing.currency,
      CustomerEmail: customerEmail,
      CancelUrl: 'https://fastcheckin.co.za/business/billing?canceled=true',
      ErrorUrl: 'https://fastcheckin.co.za/business/billing?error=true',
      SuccessUrl: 'https://fastcheckin.co.za/business/billing?success=true',
      NotifyUrl: 'https://fastcheckin.co.za/.netlify/functions/ozow-payment-notify',
      IsTest: process.env.NODE_ENV !== 'production'
    };

    const hashString = `${OZOW_SITE_CODE}${ozowData.TransactionReference}${ozowData.Amount}${ozowData.CurrencyCode}${OZOW_PRIVATE_KEY}`;
    ozowData.Hash = crypto.createHash('sha512').update(hashString).digest('hex');
    const response = await fetch(OZOW_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(OZOW_API_KEY ? { ApiKey: OZOW_API_KEY } : {}) }, body: JSON.stringify(ozowData) });
    if (!response.ok) {
      const upstream = await response.text();
      console.error('Ozow payment request failed:', response.status, upstream);
      throw new Error('Ozow payment request failed');
    }

    const result = await response.json();
    if (!result.PaymentUrl) throw new Error('Ozow payment did not return a payment URL');
    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ redirectUrl: result.PaymentUrl, transactionId }) };
  } catch (error) {
    console.error('Ozow payment error:', error);
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'Payment could not be created' }) };
  }
}
