import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Ozow configuration
const OZOW_SITE_CODE = process.env.OZOW_SITE_CODE;
const OZOW_API_KEY = process.env.OZOW_API_KEY;
const OZOW_PRIVATE_KEY = process.env.OZOW_PRIVATE_KEY;
const OZOW_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.ozow.com/request/payment'
  : 'https://sandbox.ozow.com/request/payment';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    return createOzowPayment(event);
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

async function createOzowPayment(event) {
  try {
    const { businessId, planId, billingCycle, email, amount, returnUrl } = JSON.parse(event.body);

    const transactionId = `OZ-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    // Save transaction
    await supabase.from('transactions').insert({
      id: transactionId,
      business_id: businessId,
      plan_id: planId,
      billing_cycle: billingCycle,
      amount: amount,
      status: 'pending',
      gateway: 'ozow',
      created_at: new Date().toISOString()
    });

    // Prepare Ozow request
    const ozowData = {
      SiteCode: OZOW_SITE_CODE,
      TransactionReference: transactionId,
      Amount: amount,
      CurrencyCode: 'ZAR',
      CustomerEmail: email,
      CancelUrl: returnUrl || `https://fastcheckin.co.za/business/billing?canceled=true`,
      ErrorUrl: returnUrl || `https://fastcheckin.co.za/business/billing?error=true`,
      SuccessUrl: returnUrl || `https://fastcheckin.co.za/business/billing?success=true`,
      NotifyUrl: `https://fastcheckin.co.za/.netlify/functions/ozow-payment/notify`,
      IsTest: process.env.NODE_ENV !== 'production'
    };

    // Generate signature
    const hashString = `${OZOW_SITE_CODE}${ozowData.TransactionReference}${ozowData.Amount}${ozowData.CurrencyCode}${OZOW_PRIVATE_KEY}`;
    ozowData.Hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const response = await fetch(OZOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ozowData)
    });

    const result = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        redirectUrl: result.PaymentUrl,
        transactionId
      })
    };

  } catch (error) {
    console.error('Ozow payment error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}
