// netlify/functions/get-subscription-status.js
// Programme 1: pricing from lib/packages.js SSOT

import { createClient } from '@supabase/supabase-js';
import {
  normalizePlanId,
  getPlanPricing,
  getPackage,
  resolveEffectivePlan,
  getAnalyticsLimits,
} from './lib/featureAccess.js';

export const handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const businessId = event.queryStringParameters?.businessId;

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' }),
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const resolved = await resolveEffectivePlan(supabase, businessId);
    if (resolved.error && !resolved.business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: resolved.error || 'Business not found' }),
      };
    }

    const business = resolved.business;
    const entitlements = resolved.entitlements || [];
    const effectivePlan = normalizePlanId(resolved.effectivePlan);
    const billingCycle = business.billing_cycle || 'monthly';

    const percentageDiscounts =
      entitlements.filter((e) => e.type === 'discount_percentage') || [];
    const fixedDiscounts =
      entitlements.filter((e) => e.type === 'discount_fixed') || [];

    let status = resolved.status || 'active';
    let message = 'Active subscription';
    let charge = 0;
    let validUntil = null;

    if (status === 'complimentary') {
      message = `Complimentary ${getPackage(effectivePlan).name} plan access`;
      charge = 0;
    } else if (status === 'trial') {
      message = `Free trial${business.trial_end ? ` until ${new Date(business.trial_end).toLocaleDateString()}` : ''}`;
      charge = 0;
      validUntil = business.trial_end;
    } else {
      const pricing = getPlanPricing(effectivePlan, billingCycle);
      let basePrice = pricing.amount || 0;

      for (const discount of percentageDiscounts) {
        basePrice *= 1 - (discount.value || 0) / 100;
      }
      for (const discount of fixedDiscounts) {
        basePrice = Math.max(0, basePrice - (discount.value || 0));
      }

      charge = Math.round(basePrice * 100) / 100;
      status = 'active';
      message = 'Active subscription';

      const allDiscounts = [...percentageDiscounts, ...fixedDiscounts];
      const earliestEnd = allDiscounts
        .filter((e) => e.ends_at && !e.lifetime)
        .sort(
          (a, b) =>
            new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
        )[0];

      if (earliestEnd?.ends_at) {
        message = `Discounted pricing until ${new Date(earliestEnd.ends_at).toLocaleDateString()}`;
        validUntil = earliestEnd.ends_at;
      }
    }

    const limits = getAnalyticsLimits(effectivePlan);

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
        isComplimentary: status === 'complimentary',
        isOnTrial: status === 'trial',
        currency: 'ZAR',
        limits,
        packageMeta: {
          name: getPackage(effectivePlan).name,
          maxRooms: getPackage(effectivePlan).maxRooms,
          maxStaff: getPackage(effectivePlan).maxStaff,
        },
      }),
    };
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
    };
  }
};
