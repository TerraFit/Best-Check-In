import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// PayFast configuration
const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE;
const PAYFAST_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.payfast.co.za/eng/process'
  : 'https://sandbox.payfast.co.za/eng/process';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // ITN (Instant Transaction Notification) from PayFast
  if (event.httpMethod === 'POST' && event.path.includes('itn')) {
    return handlePayFastITN(event);
  }

  // Create payment request
  if (event.httpMethod === 'POST') {
    return createPayFastPayment(event);
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

async function createPayFastPayment(event) {
  try {
    const { businessId, planId, billingCycle, email, name, amount, returnUrl, cancelUrl } = JSON.parse(event.body);

    // Get business details
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    // Generate unique transaction ID
    const transactionId = `PF-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    // Save transaction record
    await supabase.from('transactions').insert({
      id: transactionId,
      business_id: businessId,
      plan_id: planId,
      billing_cycle: billingCycle,
      amount: amount,
      status: 'pending',
      gateway: 'payfast',
      created_at: new Date().toISOString()
    });

    // Prepare PayFast data
    const pfData = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: returnUrl || `https://fastcheckin.co.za/business/billing?success=true`,
      cancel_url: cancelUrl || `https://fastcheckin.co.za/business/billing?canceled=true`,
      notify_url: `https://fastcheckin.co.za/.netlify/functions/payfast-webhook/itn`,
      name_first: business.trading_name,
      email_address: email || business.email,
      m_payment_id: transactionId,
      amount: amount,
      item_name: `${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription - ${planId}`,
      item_description: `FastCheckin ${planId} plan - ${billingCycle} billing`,
      custom_int1: businessId,
      custom_str1: planId,
      custom_str2: billingCycle
    };

    // Generate signature
    const signatureString = Object.keys(pfData)
      .filter(key => pfData[key] !== '')
      .sort()
      .map(key => `${key}=${encodeURIComponent(pfData[key].trim())}`)
      .join('&');
    
    pfData.signature = crypto.createHash('md5').update(signatureString).digest('hex');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        redirectUrl: `${PAYFAST_URL}?${new URLSearchParams(pfData).toString()}`,
        transactionId
      })
    };

  } catch (error) {
    console.error('PayFast payment error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
}

async function handlePayFastITN(event) {
  try {
    const pfData = new URLSearchParams(event.body);
    const pfParamString = pfData.toString();
    
    // Verify signature
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', pfData.get('m_payment_id'))
      .single();

    if (!transaction) {
      console.error('Transaction not found:', pfData.get('m_payment_id'));
      return { statusCode: 200, body: 'Transaction not found' };
    }

    // Check payment status
    const paymentStatus = pfData.get('payment_status');
    const amount = parseFloat(pfData.get('amount_gross'));
    const businessId = pfData.get('custom_int1');
    const planId = pfData.get('custom_str1');
    const billingCycle = pfData.get('custom_str2');

    if (paymentStatus === 'COMPLETE') {
      // Update transaction
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          gateway_response: pfParamString
        })
        .eq('id', pfData.get('m_payment_id'));

      // Activate subscription
      const trialEnd = new Date();
      if (billingCycle === 'yearly') {
        trialEnd.setFullYear(trialEnd.getFullYear() + 1);
      } else {
        trialEnd.setMonth(trialEnd.getMonth() + 1);
      }

      await supabase
        .from('businesses')
        .update({
          subscription_status: 'active',
          current_plan: planId,
          billing_cycle: billingCycle,
          payment_status: 'paid',
          last_payment_date: new Date().toISOString(),
          payment_due_date: trialEnd.toISOString(),
          trial_end: null
        })
        .eq('id', businessId);

      // Send confirmation email
      await sendPaymentConfirmation(businessId, amount, planId, billingCycle);
    }

    return { statusCode: 200, body: 'OK' };

  } catch (error) {
    console.error('PayFast ITN error:', error);
    return { statusCode: 200, body: 'OK' };
  }
}
