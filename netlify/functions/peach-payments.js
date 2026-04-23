import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Peach Payments configuration
const PEACH_API_KEY = process.env.PEACH_API_KEY;
const PEACH_ENTITY_ID = process.env.PEACH_ENTITY_ID;
const PEACH_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.peachpayments.com/v1/payments'
  : 'https://testapi.peachpayments.com/v1/payments';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    return createPeachPayment(event);
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

async function createPeachPayment(event) {
  try {
    const { businessId, planId, billingCycle, email, amount, returnUrl } = JSON.parse(event.body);

    const transactionId = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    // Save transaction
    await supabase.from('transactions').insert({
      id: transactionId,
      business_id: businessId,
      plan_id: planId,
      billing_cycle: billingCycle,
      amount: amount,
      status: 'pending',
      gateway: 'peach',
      created_at: new Date().toISOString()
    });

    // Create Peach payment
    const response = await fetch(PEACH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PEACH_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        entityId: PEACH_ENTITY_ID,
        amount: amount.toString(),
        currency: 'ZAR',
        paymentType: 'DB',
        merchantTransactionId: transactionId,
        customerEmail: email,
        returnUrl: returnUrl || `https://fastcheckin.co.za/business/billing?gateway=peach`,
        shopperResultUrl: `https://fastcheckin.co.za/.netlify/functions/peach-payments/result`
      })
    });

    const result = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        redirectUrl: result.redirect?.url,
        transactionId
      })
    };

  } catch (error) {
    console.error('Peach payment error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}
