import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { businessId, planSlug, billingCycle, paymentMethodId, trialDays } = JSON.parse(event.body);

    // Get business and plan details
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (bizError) throw bizError;

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError) throw planError;

    // Determine trial days (custom override or default)
    let trialEnd = null;
    let actualTrialDays = trialDays;

    if (!actualTrialDays) {
      // Check for custom trial override
      const { data: override } = await supabase
        .from('trial_overrides')
        .select('trial_days')
        .eq('business_id', businessId)
        .single();

      if (override) {
        actualTrialDays = override.trial_days;
      } else {
        // Default trial from settings
        const { data: settings } = await supabase
          .from('system_settings')
          .select('default_trial_days')
          .single();
        actualTrialDays = settings?.default_trial_days || 14;
      }
    }

    if (actualTrialDays > 0) {
      trialEnd = Math.floor(Date.now() / 1000) + (actualTrialDays * 24 * 60 * 60);
    }

    // Create or get Stripe customer
    let customerId = business.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.email,
        name: business.trading_name,
        metadata: { business_id: businessId }
      });
      customerId = customer.id;
      
      await supabase
        .from('businesses')
        .update({ stripe_customer_id: customerId })
        .eq('id', businessId);
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });
    }

    // Create subscription
    const priceId = billingCycle === 'yearly' 
      ? `price_${planSlug}_yearly`
      : `price_${planSlug}_monthly`;

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_end: trialEnd,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });

    // Update business record
    await supabase
      .from('businesses')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        current_plan: planSlug,
        billing_cycle: billingCycle,
        trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
        max_rooms: plan.max_rooms
      })
      .eq('id', businessId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        status: subscription.status
      })
    };

  } catch (error) {
    console.error('Subscription creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
