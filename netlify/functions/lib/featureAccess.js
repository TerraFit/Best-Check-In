/**
 * Backend feature access — authoritative commercial gates.
 * Mirror of src/services/featureAccessService.ts logic.
 */

import { createClient } from '@supabase/supabase-js';
import {
  normalizePlanId,
  planSatisfies,
  recommendUpgrade,
  getPackage,
  getPlanPricing,
} from './packages.js';
import { getFeature } from './featureRegistry.js';
import { getFeatureFlag } from './featureFlags.js';

export function buildAccessResult({
  allowed,
  featureId,
  currentPackage,
  requiredPackage,
  reason,
  visibility,
  feature,
}) {
  const recommendedPackage = allowed
    ? currentPackage
    : recommendUpgrade(currentPackage, requiredPackage);
  return {
    allowed,
    featureId,
    currentPackage: normalizePlanId(currentPackage),
    requiredPackage: normalizePlanId(requiredPackage),
    recommendedPackage: normalizePlanId(recommendedPackage),
    reason,
    visibility: visibility || feature?.visibility || 'locked',
    upsellMessage: feature?.upsellMessage || '',
    businessBenefit: feature?.businessBenefit || '',
    customerBenefit: feature?.customerBenefit || '',
    featureName: feature?.name || featureId,
  };
}

/**
 * Pure check given an already-resolved effective plan.
 */
export function checkFeatureAccess(featureId, effectivePlan, options = {}) {
  const feature = getFeature(featureId);
  const currentPackage = normalizePlanId(effectivePlan);

  if (!feature) {
    return buildAccessResult({
      allowed: false,
      featureId,
      currentPackage,
      requiredPackage: 'enterprise',
      reason: 'Unknown feature',
      visibility: 'internal',
      feature: null,
    });
  }

  if (feature.deprecated) {
    return buildAccessResult({
      allowed: false,
      featureId,
      currentPackage,
      requiredPackage: feature.minimumPackage,
      reason: `Feature deprecated since ${feature.deprecated}`,
      visibility: 'deprecated',
      feature,
    });
  }

  const flag = getFeatureFlag(featureId);
  if (flag?.forceDisabled || flag?.enabled === false) {
    return buildAccessResult({
      allowed: false,
      featureId,
      currentPackage,
      requiredPackage: feature.minimumPackage,
      reason: 'Feature disabled by flag',
      visibility: feature.visibility,
      feature,
    });
  }

  if (flag?.forceEnabled) {
    return buildAccessResult({
      allowed: true,
      featureId,
      currentPackage,
      requiredPackage: feature.minimumPackage,
      reason: 'Allowed by feature flag',
      visibility: feature.visibility,
      feature,
    });
  }

  const requiredPackage = normalizePlanId(
    flag?.overrideMinimumPackage || feature.minimumPackage
  );

  if (options.temporaryUnlocks?.includes?.(featureId)) {
    return buildAccessResult({
      allowed: true,
      featureId,
      currentPackage,
      requiredPackage,
      reason: 'Temporary unlock',
      visibility: feature.visibility,
      feature,
    });
  }

  const allowed = planSatisfies(currentPackage, requiredPackage);
  return buildAccessResult({
    allowed,
    featureId,
    currentPackage,
    requiredPackage,
    reason: allowed
      ? 'Package allows feature'
      : `Requires ${getPackage(requiredPackage).name} or higher`,
    visibility: feature.visibility,
    feature,
  });
}

export function getAnalyticsLimits(effectivePlan) {
  const plan = normalizePlanId(effectivePlan);
  return {
    subscriptionTier: plan === 'enterprise' ? 'business' : plan,
    canViewCountries: planSatisfies(plan, 'growth'),
    canViewRegions: planSatisfies(plan, 'pro'),
    canViewCities: planSatisfies(plan, 'business'),
    maxDrillLevel: planSatisfies(plan, 'business')
      ? 'cities'
      : planSatisfies(plan, 'pro')
        ? 'regions'
        : planSatisfies(plan, 'growth')
          ? 'countries'
          : 'continents',
    maxStaff: getPackage(plan).maxStaff,
  };
}

/**
 * Resolve effective plan for a business from Supabase.
 */
export async function resolveEffectivePlan(supabase, businessId) {
  const { data: business, error } = await supabase
    .from('businesses')
    .select(
      'id, subscription_tier, current_plan, subscription_status, trial_end, billing_cycle'
    )
    .eq('id', businessId)
    .single();

  if (error || !business) {
    return {
      effectivePlan: 'starter',
      status: 'unknown',
      business: null,
      error: error?.message || 'Business not found',
    };
  }

  let entitlements = [];
  try {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('entitlements')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);
    entitlements = data || [];
    entitlements = entitlements.filter((e) => {
      if (e.lifetime) return true;
      if (e.starts_at && e.starts_at > now) return false;
      if (e.ends_at && e.ends_at < now) return false;
      return true;
    });
  } catch {
    entitlements = [];
  }

  const complimentary = entitlements.find((e) => e.type === 'complimentary_plan');
  if (complimentary?.complimentary_plan) {
    return {
      effectivePlan: normalizePlanId(complimentary.complimentary_plan),
      status: 'complimentary',
      business,
      entitlements,
    };
  }

  const trial = entitlements.find((e) => e.type === 'trial');
  if (trial || business.subscription_status === 'trial') {
    return {
      effectivePlan: normalizePlanId(
        business.current_plan || business.subscription_tier || 'starter'
      ),
      status: 'trial',
      business,
      entitlements,
    };
  }

  return {
    effectivePlan: normalizePlanId(
      business.current_plan || business.subscription_tier || 'starter'
    ),
    status: business.subscription_status || 'active',
    business,
    entitlements,
  };
}

/**
 * Assert feature for a business; returns null if allowed, or an HTTP response body object.
 */
export async function assertFeatureAccess(supabase, businessId, featureId) {
  const resolved = await resolveEffectivePlan(supabase, businessId);
  if (resolved.error && !resolved.business) {
    return {
      statusCode: 404,
      body: { error: resolved.error || 'Business not found', code: 'BUSINESS_NOT_FOUND' },
    };
  }
  const access = checkFeatureAccess(featureId, resolved.effectivePlan);
  if (access.allowed) return null;
  return {
    statusCode: 403,
    body: {
      error: access.reason,
      code: 'UPGRADE_REQUIRED',
      featureId: access.featureId,
      requiredPackage: access.requiredPackage,
      recommendedPackage: access.recommendedPackage,
      currentPackage: access.currentPackage,
      upsellMessage: access.upsellMessage,
    },
  };
}

export function createSupabaseServiceClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export { getPlanPricing, normalizePlanId, getPackage, planSatisfies, recommendUpgrade };
