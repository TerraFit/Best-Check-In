/**
 * Frontend feature access — mirrors netlify/functions/lib/featureAccess.js
 * Backend remains authoritative for sensitive operations.
 */

import {
  normalizePlanId,
  planSatisfies,
  recommendUpgrade,
  getPackage,
  type PlanType,
} from '../config/packages';
import { getFeature, type FeatureDefinition } from '../config/featureRegistry';
import { getFeatureFlag } from '../config/featureFlags';

export interface FeatureAccessResult {
  allowed: boolean;
  featureId: string;
  currentPackage: PlanType;
  requiredPackage: PlanType;
  recommendedPackage: PlanType;
  reason: string;
  visibility: string;
  upsellMessage: string;
  businessBenefit: string;
  customerBenefit: string;
  featureName: string;
  feature: FeatureDefinition | null;
}

export interface AnalyticsLimits {
  subscriptionTier: PlanType;
  canViewCountries: boolean;
  canViewRegions: boolean;
  canViewCities: boolean;
  maxDrillLevel: string;
  maxStaff: number | null;
}

function buildResult(partial: {
  allowed: boolean;
  featureId: string;
  currentPackage: PlanType;
  requiredPackage: PlanType;
  reason: string;
  visibility: string;
  feature: FeatureDefinition | null;
}): FeatureAccessResult {
  const recommendedPackage = partial.allowed
    ? partial.currentPackage
    : recommendUpgrade(partial.currentPackage, partial.requiredPackage);
  return {
    ...partial,
    recommendedPackage,
    upsellMessage: partial.feature?.upsellMessage || '',
    businessBenefit: partial.feature?.businessBenefit || '',
    customerBenefit: partial.feature?.customerBenefit || '',
    featureName: partial.feature?.name || partial.featureId,
  };
}

export function checkFeatureAccess(
  featureId: string,
  effectivePlan: string | null | undefined,
  options?: { temporaryUnlocks?: string[] }
): FeatureAccessResult {
  const feature = getFeature(featureId);
  const currentPackage = normalizePlanId(effectivePlan);

  if (!feature) {
    return buildResult({
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
    return buildResult({
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
    return buildResult({
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
    return buildResult({
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

  if (options?.temporaryUnlocks?.includes(featureId)) {
    return buildResult({
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
  return buildResult({
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

export function getAnalyticsLimits(effectivePlan?: string | null): AnalyticsLimits {
  const plan = normalizePlanId(effectivePlan);
  const displayTier: PlanType =
    plan === 'enterprise' ? 'business' : plan;
  return {
    subscriptionTier: displayTier,
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
