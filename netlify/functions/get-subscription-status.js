import { normalizePlanId, getPlanPricing, getPackage, resolveEffectivePlan, getAnalyticsLimits } from './lib/featureAccess.js';
import auth from './_auth.cjs';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

export const handler = async function (event) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const businessId = event.queryStringParameters?.businessId;
    if (!businessId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };

    const authentication = authenticateRequest(event);
    if (!authentication.ok) return authFailure(authentication, headers);
    const principal = authentication.principal;
    const authorized = ['super_admin', 'platform'].includes(principal.actorType)
      ? requirePlatformPermission(principal, 'platform:subscriptions:read')
      : requireBusinessPermission(principal, 'canManageSettings');
    if (!authorized) return authFailure({ ok: false, status: 403, error: 'Missing permission to view subscription status' }, headers);

    const tenant = resolveTenant(principal, businessId);
    if (!tenant.ok) return authFailure(tenant, headers);

    const resolved = await resolveEffectivePlan(null, tenant.businessId);
    if (resolved.error && !resolved.business) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };

    const business = resolved.business;
    const entitlements = resolved.entitlements || [];
    const effectivePlan = normalizePlanId(resolved.effectivePlan);
    const billingCycle = business.billing_cycle || 'monthly';
    const status = business.subscription_status || resolved.status || 'active';
    const percentageDiscounts = entitlements.filter((e) => e.type === 'discount_percentage');
    const fixedDiscounts = entitlements.filter((e) => e.type === 'discount_fixed');

    let message = 'Active subscription';
    let charge = 0;
    let validUntil = null;
    let trialDaysLeft = null;

    if (status === 'complimentary') {
      message = `Complimentary ${getPackage(effectivePlan).name} plan access`;
    } else if (status === 'trial' || status === 'trialing') {
      message = `Free trial${business.trial_end ? ` until ${new Date(business.trial_end).toLocaleDateString()}` : ''}`;
      validUntil = business.trial_end;
      if (business.trial_end) trialDaysLeft = Math.max(0, Math.ceil((new Date(business.trial_end).getTime() - Date.now()) / 86400000));
    } else if (status === 'past_due') {
      message = 'Payment failed — your account is in the payment grace period';
      validUntil = business.payment_grace_ends_at || null;
      charge = getPlanPricing(effectivePlan, billingCycle, business.total_rooms).amount;
    } else if (status === 'restricted') {
      message = 'Account restricted — payment required to restore access';
      validUntil = null;
      charge = getPlanPricing(effectivePlan, billingCycle, business.total_rooms).amount;
    } else {
      const pricing = getPlanPricing(effectivePlan, billingCycle, business.total_rooms);
      charge = pricing.amount;
      percentageDiscounts.forEach((d) => { if (d.percentage) charge *= 1 - Number(d.percentage) / 100; });
      fixedDiscounts.forEach((d) => { if (d.amount) charge = Math.max(0, charge - Number(d.amount)); });
      validUntil = business.subscription_end || business.current_period_end || business.payment_due_date || null;
    }

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
        trialEnd: business.trial_end || null,
        trialDaysLeft,
        paymentGraceEndsAt: business.payment_grace_ends_at || null,
        paymentStatus: business.payment_status || null,
        paymentMethod: business.payment_method || null,
        currency: 'ZAR',
        limits: getAnalyticsLimits(effectivePlan),
        packageMeta: { name: getPackage(effectivePlan).name, maxRooms: getPackage(effectivePlan).maxRooms, maxStaff: getPackage(effectivePlan).maxStaff },
      }),
    };
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
