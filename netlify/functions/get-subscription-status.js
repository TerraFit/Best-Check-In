// netlify/functions/get-subscription-status.js
import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const businessId = event.queryStringParameters?.businessId;
    
    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Fetch business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, trading_name, subscription_tier, current_plan, subscription_status, trial_end, payment_status, billing_cycle')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('Business fetch error:', businessError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    // Fetch active entitlements
    const { data: entitlements, error: entitlementsError } = await supabase
      .from('entitlements')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .lte('starts_at', new Date().toISOString())
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .or('lifetime.eq.true');

    // Check for complimentary plan
    const complimentary = entitlements?.find(e => e.type === 'complimentary_plan');
    
    // Check for trial
    const trial = entitlements?.find(e => e.type === 'trial');

    // Check for discounts
    const percentageDiscounts = entitlements?.filter(e => e.type === 'discount_percentage') || [];
    const fixedDiscounts = entitlements?.filter(e => e.type === 'discount_fixed') || [];

    // Determine effective plan and pricing
    let effectivePlan = business.current_plan || business.subscription_tier || 'starter';
    let status = 'active';
    let message = 'Active subscription';
    let charge = 0;
    let validUntil = null;

    // Get plan pricing
    const planPricing = {
      starter: { monthly: 349, yearly: 3490 },
      growth: { monthly: 649, yearly: 6490 },
      pro: { monthly: 949, yearly: 9490 },
      business: { monthly: 1290, yearly: 12900 }
    };

    const billingCycle = business.billing_cycle || 'monthly';

    // Check for complimentary (highest priority)
    if (complimentary) {
      effectivePlan = complimentary.complimentary_plan || effectivePlan;
      status = 'complimentary';
      message = `Complimentary ${effectivePlan} plan access`;
      charge = 0;
      validUntil = complimentary.ends_at || complimentary.lifetime ? null : complimentary.ends_at;
    }
    // Check for trial
    else if (trial || business.subscription_status === 'trial') {
      status = 'trial';
      message = `Free trial${business.trial_end ? ` until ${new Date(business.trial_end).toLocaleDateString()}` : ''}`;
      charge = 0;
      validUntil = business.trial_end;
    }
    // Standard pricing with discounts
    else {
      let basePrice = planPricing[effectivePlan as keyof typeof planPricing]?.[billingCycle as 'monthly' | 'yearly'] || 0;
      
      // Apply percentage discounts
      for (const discount of percentageDiscounts) {
        basePrice *= (1 - (discount.value || 0) / 100);
      }
      
      // Apply fixed discounts
      for (const discount of fixedDiscounts) {
        basePrice = Math.max(0, basePrice - (discount.value || 0));
      }
      
      charge = Math.round(basePrice * 100) / 100;
      status = 'active';
      message = 'Active subscription';
      
      // Check for discount end date
      const allDiscounts = [...percentageDiscounts, ...fixedDiscounts];
      const earliestEnd = allDiscounts
        .filter(e => e.ends_at && !e.lifetime)
        .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())[0];
      
      if (earliestEnd?.ends_at) {
        message = `Discounted pricing until ${new Date(earliestEnd.ends_at).toLocaleDateString()}`;
        validUntil = earliestEnd.ends_at;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        plan: effectivePlan,
        status,
        message,
        charge,
        validUntil,
        billingCycle,
        isComplimentary: !!complimentary,
        isOnTrial: !!trial || business.subscription_status === 'trial'
      })
    };

  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};
