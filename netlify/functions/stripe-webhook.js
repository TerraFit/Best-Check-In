import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }

  switch (stripeEvent.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(stripeEvent.data.object);
      break;
    
    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(stripeEvent.data.object);
      break;
    
    case 'invoice.payment_failed':
      await handlePaymentFailure(stripeEvent.data.object);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionCancellation(stripeEvent.data.object);
      break;
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function handleSubscriptionUpdate(subscription) {
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (business) {
    await supabase
      .from('businesses')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end
      })
      .eq('id', business.id);
  }
}

async function handlePaymentSuccess(invoice) {
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (business) {
    await supabase
      .from('subscription_invoices')
      .insert({
        business_id: business.id,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_paid,
        status: 'paid',
        invoice_url: invoice.hosted_invoice_url,
        paid_at: new Date().toISOString()
      });

    // Update payment status
    await supabase
      .from('businesses')
      .update({
        payment_status: 'paid',
        last_payment_date: new Date().toISOString(),
        payment_due_date: new Date(invoice.next_payment_attempt * 1000).toISOString()
      })
      .eq('id', business.id);
  }
}

async function handlePaymentFailure(invoice) {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, email, trading_name')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (business) {
    await supabase
      .from('businesses')
      .update({
        payment_status: 'failed',
        subscription_status: 'past_due'
      })
      .eq('id', business.id);

    // Send email notification
    await sendPaymentFailureEmail(business);
  }
}

async function handleSubscriptionCancellation(subscription) {
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (business) {
    await supabase
      .from('businesses')
      .update({
        subscription_status: 'canceled',
        status: 'archived'
      })
      .eq('id', business.id);
  }
}
