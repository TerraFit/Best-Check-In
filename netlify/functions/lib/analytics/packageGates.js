/**
 * Analytics package gates — authoritative for Netlify functions.
 * UI must mirror these; never trust client-only limits.
 */

import { normalizePlanId, planSatisfies, getPackage } from '../packages.js';

/** Max drill depth by plan (inclusive) */
const MAX_DRILL = {
  starter: null, // no interactive drill
  growth: 'country',
  pro: 'city',
  business: 'city',
  enterprise: 'city',
};

const LEVEL_ORDER = {
  world: 0,
  continent: 1,
  country: 2,
  region: 3,
  city: 4,
};

export function getAnalyticsPlanLimits(plan) {
  const p = normalizePlanId(plan);
  const maxDrillLevel = MAX_DRILL[p] ?? null;
  return {
    plan: p,
    planName: getPackage(p).name,
    canInteractiveMap: planSatisfies(p, 'growth'),
    canViewContinents: planSatisfies(p, 'growth'),
    canViewCountries: planSatisfies(p, 'growth'),
    canViewRegions: planSatisfies(p, 'pro'),
    canViewCities: planSatisfies(p, 'pro'),
    maxDrillLevel,
    canSnapshotPdf: planSatisfies(p, 'pro'),
    canBiReport: planSatisfies(p, 'business'),
    canOpsAnalytics: planSatisfies(p, 'business'),
    canAiInsights: planSatisfies(p, 'pro'),
  };
}

/**
 * @param {string} plan
 * @param {string} level - world|continent|country|region|city
 * @returns {{ allowed: boolean, reason?: string, requiredPlan?: string, limits: object }}
 */
export function assertDrillAllowed(plan, level) {
  const limits = getAnalyticsPlanLimits(plan);
  const lvl = (level || 'world').toLowerCase();

  if (!limits.canInteractiveMap) {
    return {
      allowed: false,
      reason: 'Interactive Visitor Origin Explorer requires Growth or higher',
      requiredPlan: 'growth',
      limits,
    };
  }

  if (lvl === 'world' || lvl === 'continent') {
    return { allowed: true, limits };
  }

  if (lvl === 'country') {
    if (!limits.canViewCountries) {
      return {
        allowed: false,
        reason: 'Country-level insights require Growth or higher',
        requiredPlan: 'growth',
        limits,
      };
    }
    return { allowed: true, limits };
  }

  if (lvl === 'region') {
    if (!limits.canViewRegions) {
      return {
        allowed: false,
        reason: 'Province and region drill-down requires Pro or higher',
        requiredPlan: 'pro',
        limits,
      };
    }
    return { allowed: true, limits };
  }

  if (lvl === 'city') {
    if (!limits.canViewCities) {
      return {
        allowed: false,
        reason: 'City insights require Pro or higher',
        requiredPlan: 'pro',
        limits,
      };
    }
    return { allowed: true, limits };
  }

  return {
    allowed: false,
    reason: `Unknown drill level: ${level}`,
    limits,
  };
}

export function assertSnapshotAllowed(plan) {
  const limits = getAnalyticsPlanLimits(plan);
  if (!limits.canSnapshotPdf) {
    return {
      allowed: false,
      reason: 'Analytics Snapshot PDF requires Pro or higher',
      requiredPlan: 'pro',
      limits,
    };
  }
  return { allowed: true, limits };
}

export function assertBiReportAllowed(plan) {
  const limits = getAnalyticsPlanLimits(plan);
  if (!limits.canBiReport) {
    return {
      allowed: false,
      reason: 'Business Intelligence Report requires Business or higher',
      requiredPlan: 'business',
      limits,
    };
  }
  return { allowed: true, limits };
}

export function levelAtOrBelowMax(level, maxLevel) {
  if (!maxLevel) return false;
  return (LEVEL_ORDER[level] ?? 99) <= (LEVEL_ORDER[maxLevel] ?? -1);
}
