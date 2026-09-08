// netlify/functions/get-subscription-status.js
// Programme 1: pricing from lib/packages.js SSOT

import {
  normalizePlanId,
  getPlanPricing,
  getPackage,
  resolveEffectivePlan,
  getAnalyticsLimits,
} from './lib/featureAccess.js';

import auth from './_auth.cjs';

const {
  authenticateRequest,
  requireBusinessPermission,
  requirePlatformPermission,
  resolveTenant,
  authFailure,
} = auth;

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

    // Subscription data is tenant-scoped and must never be resolved solely
    // from a caller-supplied businessId.
    const authentication = authenticateRequest(event);

    if (!authentication.ok) {
      return authFailure(authentication, headers);
    }

    const principal = authentication.principal;

    const authorized =
      ['super_admin', 'platform'].includes(principal.actorType)
        ? requirePlatformPermission(
            principal,
            'platform:subscriptions:read'
          )
        : requireBusinessPermission(
            principal,
            'canManageSettings'
          );

    if (!authorized) {
      return authFailure(
        {
          ok: false,
          status: 403,
          error: 'Missing permission to view subscription status',
        },
        headers
      );
    }

    const tenant = resolveTenant(principal, businessId);

    if (!tenant.ok) {
      return authFailure(tenant, headers);
    }

    const authorizedBusinessId = tenant.businessId;

    // REST-only plan resolution (no supabase-js / Realtime / WebSocket)
    const resolved = await resolveEffectivePlan(null, authorizedBusinessId);
    if (resolved.error && !resolved.business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' }),
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
      charge = pricing.price;

      percentageDiscounts.forEach((d) => {
        if (d.percentage) charge = charge * (1 - Number(d.percentage) / 100);
      });
      fixedDiscounts.forEach((d) => {
        if (d.amount) charge = Math.max(0, charge - Number(d.amount));
      });

      message = 'Active subscription';
      validUntil = business.subscription_end || business.current_period_end || null;
    }

    const limits = getAnalyticsLimits(effectivePlan);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        plan: effectivePlan,
        status,
        message,
        charge: Math.round(charge * 100) / 100,
        billingCycle,
        validUntil,
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
      }),
    };
  }
};
