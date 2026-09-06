import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import auth from './_auth.cjs';
import { getPlanPricing, getPackage } from './lib/packages.js';

const { requireBusinessActor, resolveTenant } = auth;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// PayFast configuration
const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE;
const PAYFAST_URL = process.env.NODE_ENV === 'production'
  ? 'https://www.payfast.co.za/eng/process'
  : 'https://sandbox.payfast.co.za/eng/process';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function safeError(statusCode, error) {
  return { statusCode, headers: jsonHeaders, body: JSON.stringify({ error }) };
}

function buildPayFastSignature(data) {
  const signatureString = Object.keys(data)
    .filter((key) => key !== 'signature' && data[key] !== undefined && data[key] !== null && data[key] !== '')
    .sort()
    .map((key) => `${key}=${encodeURIComponent(String(data[key]).trim())}`)
    .join('&');

  const withPassphrase = PAYFAST_PASSPHRASE
    ? `${signatureString}&passphrase=${encodeURIComponent(PAYFAST_PASSPHRASE.trim())}`
    : signatureString;

  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}

function signaturesMatch(expected, supplied) {
  if (typeof expected !== 'string' || typeof supplied !== 'string' || expected.length !== supplied.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export const handler = async (event) => {
  const headers = jsonHeaders;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // ITN is a server-to-server callback and therefore cannot use the business JWT.
  if (event.httpMethod === 'POST' && event.path.includes('itn')) {
    return handlePayFastITN(event);
  }

  if (event.httpMethod === 'POST') {
    return createPayFastPayment(event);
  }

  return safeError(405, 'Method not allowed');
};

async function createPayFastPayment(event) {
  try {
    const gate = requireBusinessActor(event);
    if (!gate.ok) return safeError(gate.status || 403, gate.error || 'Forbidden');
    if (gate.principal.actorType !== 'business') return safeError(403, 'Business owner access required');

    const body = JSON.parse(event.body || '{}');
    const { businessId, planId, billingCycle, email, returnUrl, cancelUrl } = body;

    const scope = resolveTenant(gate.principal, businessId);
    if (!scope.ok) return safeError(scope.status, scope.error);

    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return safeError(400, 'Invalid billing cycle');
    }

    const pricing = getPlanPricing(planId, billingCycle);
    const plan = getPackage(planId);
    if (!plan || pricing.contactSales || pricing.amount <= 0) {
      return safeError(400, 'Selected plan is not available for online payment');
    }

    // Never trust the browser-supplied amount or business identity.
    const authoritativeAmount = pricing.amount;
    const authoritativeBusinessId = scope.businessId;

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id,trading_name,email,status')
      .eq('id', authoritativeBusinessId)
      .single();

    if (businessError || !business) return safeError(404, 'Business not found');
    if (business.status !== 'approved') return safeError(403, 'Business is not approved');

    const transactionId = `PF-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

    const { error: transactionError } = await supabase.from('transactions').insert({
      id: transactionId,
      business_id: authoritativeBusinessId,
      plan_id: plan.id,
      billing_cycle: billingCycle,
      amount: authoritativeAmount,
      status: 'pending',
      gateway: 'payfast',
      created_at: new Date().toISOString()
    });

    if (transactionError) {
      console.error('PayFast transaction creation failed:', transactionError.message || transactionError);
      return safeError(500, 'Unable to create payment');
    }

    const pfData = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: returnUrl || 'https://fastcheckin.co.za/business/billing?success=true',
      cancel_url: cancelUrl || 'https://fastcheckin.co.za/business/billing?canceled=true',
      notify_url: 'https://fastcheckin.co.za/.netlify/functions/payfast-webhook/itn',
      name_first: business.trading_name,
      email_address: email || business.email,
      m_payment_id: transactionId,
      amount: authoritativeAmount.toFixed(2),
      item_name: `${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription - ${plan.id}`,
      item_description: `FastCheckin ${plan.id} plan - ${billingCycle} billing`,
      custom_int1: authoritativeBusinessId,
      custom_str1: plan.id,
      custom_str2: billingCycle
    };

    pfData.signature = buildPayFastSignature(pfData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        redirectUrl: `${PAYFAST_URL}?${new URLSearchParams(pfData).toString()}`,
        transactionId
      })
    };
  } catch (error) {
    console.error('PayFast payment error:', error?.message || error);
    return safeError(500, 'Unable to create payment');
  }
}

async function handlePayFastITN(event) {
  try {
    const pfData = Object.fromEntries(new URLSearchParams(event.body || ''));
    const suppliedSignature = pfData.signature;

    if (!suppliedSignature || !PAYFAST_MERCHANT_ID) {
      console.error('PayFast ITN missing signature or merchant configuration');
      return { statusCode: 400, headers, body: 'Invalid ITN' };
    }

    const expectedSignature = buildPayFastSignature(pfData);
    if (!signaturesMatch(expectedSignature, suppliedSignature)) {
      console.error('PayFast ITN signature verification failed');
      return { statusCode: 400, headers, body: 'Invalid ITN signature' };
    }

    if (pfData.merchant_id !== PAYFAST_MERCHANT_ID) {
      console.error('PayFast ITN merchant mismatch');
      return { statusCode: 400, headers, body: 'Invalid merchant' };
    }

    const paymentId = pfData.m_payment_id;
    if (!paymentId) return { statusCode: 400, headers, body: 'Invalid payment' };

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id,business_id,plan_id,billing_cycle,amount,status,gateway')
      .eq('id', paymentId)
      .eq('gateway', 'payfast')
      .single();

    if (transactionError || !transaction) {
      console.error('PayFast transaction not found:', paymentId);
      return { statusCode: 200, headers, body: 'Transaction not found' };
    }

    const paymentStatus = pfData.payment_status;
    const receivedAmount = Number.parseFloat(pfData.amount_gross);
    const expectedAmount = Number(transaction.amount);

    if (!Number.isFinite(receivedAmount) || Math.abs(receivedAmount - expectedAmount) > 0.001) {
      console.error('PayFast ITN amount mismatch:', { paymentId, receivedAmount, expectedAmount });
      return { statusCode: 400, headers, body: 'Invalid payment amount' };
    }

    if (pfData.custom_int1 !== String(transaction.business_id)
      || pfData.custom_str1 !== String(transaction.plan_id)
      || pfData.custom_str2 !== String(transaction.billing_cycle)) {
      console.error('PayFast ITN transaction metadata mismatch:', paymentId);
      return { statusCode: 400, headers, body: 'Invalid payment metadata' };
    }

    if (paymentStatus === 'COMPLETE' && transaction.status !== 'completed') {
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          gateway_response: new URLSearchParams(pfData).toString()
        })
        .eq('id', paymentId)
        .eq('status', 'pending');

      const dueDate = new Date();
      if (transaction.billing_cycle === 'yearly') dueDate.setFullYear(dueDate.getFullYear() + 1);
      else dueDate.setMonth(dueDate.getMonth() + 1);

      await supabase
        .from('businesses')
        .update({
          subscription_status: 'active',
          current_plan: transaction.plan_id,
          billing_cycle: transaction.billing_cycle,
          payment_status: 'paid',
          last_payment_date: new Date().toISOString(),
          payment_due_date: dueDate.toISOString(),
          trial_end: null
        })
        .eq('id', transaction.business_id);

      await sendPaymentConfirmation(transaction.business_id, receivedAmount, transaction.plan_id, transaction.billing_cycle);
    }

    return { statusCode: 200, headers, body: 'OK' };
  } catch (error) {
    console.error('PayFast ITN error:', error?.message || error);
    return { statusCode: 200, headers, body: 'OK' };
  }
}
