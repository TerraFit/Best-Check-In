/**
 * Runtime Feature Registry — keep in sync with netlify/functions/lib/featureRegistry.js
 * Lifecycle: version, introduced, deprecated
 */

import type { PlanType } from './packages';

export type FeatureVisibility =
  | 'internal'
  | 'prototype'
  | 'beta'
  | 'preview'
  | 'visible'
  | 'locked'
  | 'released'
  | 'deprecated';

export type FeatureStatus = 'implemented' | 'partial' | 'planned' | 'missing';

export interface FeatureDefinition {
  id: string;
  name: string;
  category: string;
  minimumPackage: PlanType;
  visibility: FeatureVisibility;
  status: FeatureStatus;
  dependencies: string[];
  upsellMessage: string;
  businessBenefit: string;
  customerBenefit: string;
  version: string;
  introduced: string;
  deprecated: string | null;
}

export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  digital_checkin: {
    id: 'digital_checkin',
    name: 'Digital guest check-in',
    category: 'Reception',
    minimumPackage: 'starter',
    visibility: 'released',
    status: 'implemented',
    dependencies: [],
    upsellMessage: '',
    businessBenefit: 'Compliance at scale',
    customerBenefit: 'Faster arrival',
    version: '1.0.0',
    introduced: '2025-01-01',
    deprecated: null,
  },
  visitor_overview: {
    id: 'visitor_overview',
    name: 'Basic visitor overview',
    category: 'Analytics',
    minimumPackage: 'starter',
    visibility: 'released',
    status: 'partial',
    dependencies: [],
    upsellMessage: 'Upgrade to Growth for country-level visitor origins.',
    businessBenefit: 'Situation awareness',
    customerBenefit: 'Simple counts',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  visitor_countries: {
    id: 'visitor_countries',
    name: 'Country-level visitor insights',
    category: 'Analytics',
    minimumPackage: 'growth',
    visibility: 'released',
    status: 'partial',
    dependencies: ['visitor_overview'],
    upsellMessage:
      'Country origins help you focus marketing where guests actually come from.',
    businessBenefit: 'Market focus',
    customerBenefit: 'Target the right countries',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  visitor_regions: {
    id: 'visitor_regions',
    name: 'Province / region insights',
    category: 'Analytics',
    minimumPackage: 'pro',
    visibility: 'released',
    status: 'partial',
    dependencies: ['visitor_countries'],
    upsellMessage: 'Regional drill-down supports local campaigns and ops planning.',
    businessBenefit: 'Regional strategy',
    customerBenefit: 'Deeper geographic insight',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  visitor_cities: {
    id: 'visitor_cities',
    name: 'City-level visitor insights',
    category: 'Analytics',
    minimumPackage: 'business',
    visibility: 'preview',
    status: 'partial',
    dependencies: ['visitor_regions'],
    upsellMessage:
      'City-level insight supports local demand decisions and multi-site readiness.',
    businessBenefit: 'Local demand visibility',
    customerBenefit: 'Act on city patterns',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  referral_analytics: {
    id: 'referral_analytics',
    name: 'How guests found you',
    category: 'Marketing',
    minimumPackage: 'growth',
    visibility: 'released',
    status: 'partial',
    dependencies: [],
    upsellMessage: 'See which channels drive real check-ins.',
    businessBenefit: 'Channel ROI',
    customerBenefit: 'Know what works',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  travel_patterns: {
    id: 'travel_patterns',
    name: 'Travel pattern tracking',
    category: 'Analytics',
    minimumPackage: 'pro',
    visibility: 'released',
    status: 'partial',
    dependencies: [],
    upsellMessage: 'Understand arriving-from and next-destination patterns on Pro.',
    businessBenefit: 'Product design insight',
    customerBenefit: 'Understand stay flows',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  marketing_export: {
    id: 'marketing_export',
    name: 'Marketing contact export',
    category: 'Marketing',
    minimumPackage: 'growth',
    visibility: 'locked',
    status: 'partial',
    dependencies: [],
    upsellMessage: 'Export consenting contacts for campaigns — available from Growth.',
    businessBenefit: 'Campaign lists you own',
    customerBenefit: 'Reach guests who opted in',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  official_register_export: {
    id: 'official_register_export',
    name: 'Official register export',
    category: 'Administration',
    minimumPackage: 'pro',
    visibility: 'locked',
    status: 'partial',
    dependencies: [],
    upsellMessage: 'Statutory-oriented register exports with audit — included from Pro.',
    businessBenefit: 'Compliance packs',
    customerBenefit: 'Authoritative extracts',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  audit_trail: {
    id: 'audit_trail',
    name: 'Audit trail',
    category: 'Administration',
    minimumPackage: 'pro',
    visibility: 'released',
    status: 'implemented',
    dependencies: [],
    upsellMessage: 'Full audit trail of sensitive changes — Pro and above.',
    businessBenefit: 'Accountability',
    customerBenefit: 'Know who changed what',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  staff_portal: {
    id: 'staff_portal',
    name: 'Staff portal',
    category: 'Operations',
    minimumPackage: 'growth',
    visibility: 'released',
    status: 'partial',
    dependencies: [],
    upsellMessage: 'More staff seats and team tools from Growth upward.',
    businessBenefit: 'Team coverage',
    customerBenefit: 'Parallel work',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
  custom_branding: {
    id: 'custom_branding',
    name: 'Custom branding',
    category: 'Management',
    minimumPackage: 'pro',
    visibility: 'released',
    status: 'partial',
    dependencies: [],
    upsellMessage: 'Logo and colour control on Pro.',
    businessBenefit: 'Brand control',
    customerBenefit: 'Professional look',
    version: '1.0.0',
    introduced: '2025-06-01',
    deprecated: null,
  },
};

export function getFeature(featureId: string): FeatureDefinition | null {
  return FEATURE_REGISTRY[featureId] || null;
}

export function listFeatures(): FeatureDefinition[] {
  return Object.values(FEATURE_REGISTRY);
}

/** Features visible on billing comparison for a package (released/visible/locked/preview). */
export function featuresForPackageDisplay(planId: PlanType): FeatureDefinition[] {
  const { planSatisfies } = require('./packages') as typeof import('./packages');
  return listFeatures().filter(
    (f) =>
      planSatisfies(planId, f.minimumPackage) &&
      ['released', 'visible', 'locked', 'preview'].includes(f.visibility) &&
      f.status !== 'missing'
  );
}
