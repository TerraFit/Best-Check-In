/**
 * Package SSOT — keep in sync with netlify/functions/lib/packages.js
 */

export type PlanType = 'starter' | 'growth' | 'pro' | 'business' | 'enterprise';

export interface PackageDefinition {
  id: PlanType;
  name: string;
  minRooms: number;
  maxRooms: number | null;
  maxStaff: number | null;
  description: string;
  upgradeOrder: number;
  priceMonthly: number;
  priceYearly: number;
  currency: 'ZAR';
  popular: boolean;
  contactSales: boolean;
  color: 'green' | 'amber' | 'blue' | 'purple' | 'stone';
}

export const PLAN_ORDER: PlanType[] = [
  'starter',
  'growth',
  'pro',
  'business',
  'enterprise',
];

export const PACKAGES: Record<PlanType, PackageDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    minRooms: 1,
    maxRooms: 5,
    maxStaff: 3,
    description: 'Replace paper. Digitise reception. Ensure legal compliance.',
    upgradeOrder: 0,
    priceMonthly: 349,
    priceYearly: 3490,
    currency: 'ZAR',
    popular: false,
    contactSales: false,
    color: 'green',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    minRooms: 6,
    maxRooms: 10,
    maxStaff: 8,
    description: 'Improve daily operations, staff capacity, and country-level insight.',
    upgradeOrder: 1,
    priceMonthly: 649,
    priceYearly: 6490,
    currency: 'ZAR',
    popular: true,
    contactSales: false,
    color: 'amber',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    minRooms: 11,
    maxRooms: 15,
    maxStaff: 20,
    description: 'Professional management: audit, advanced reporting, regional analytics.',
    upgradeOrder: 2,
    priceMonthly: 949,
    priceYearly: 9490,
    currency: 'ZAR',
    popular: false,
    contactSales: false,
    color: 'blue',
  },
  business: {
    id: 'business',
    name: 'Business',
    minRooms: 16,
    maxRooms: 20,
    maxStaff: 50,
    description: 'Manage multiple establishments from one hospitality business dashboard.',
    upgradeOrder: 3,
    priceMonthly: 1290,
    priceYearly: 12900,
    currency: 'ZAR',
    popular: false,
    contactSales: false,
    color: 'purple',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    minRooms: 20,
    maxRooms: null,
    maxStaff: null,
    description: 'White label, API, custom integrations, dedicated support and security.',
    upgradeOrder: 4,
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'ZAR',
    popular: false,
    contactSales: true,
    color: 'stone',
  },
};

export function normalizePlanId(plan?: string | null): PlanType {
  if (!plan) return 'starter';
  const id = plan.toLowerCase().trim() as PlanType;
  return PACKAGES[id] ? id : 'starter';
}

export function getPackage(planId?: string | null): PackageDefinition {
  return PACKAGES[normalizePlanId(planId)];
}

export function getUpgradeOrder(planId?: string | null): number {
  return getPackage(planId).upgradeOrder;
}

export function planSatisfies(currentPlan?: string | null, requiredPlan?: string | null): boolean {
  return getUpgradeOrder(currentPlan) >= getUpgradeOrder(requiredPlan);
}

export function recommendUpgrade(
  currentPlan?: string | null,
  requiredPlan?: string | null
): PlanType {
  const current = normalizePlanId(currentPlan);
  const required = normalizePlanId(requiredPlan);
  if (planSatisfies(current, required)) return current;
  const curOrder = getUpgradeOrder(current);
  const reqOrder = getUpgradeOrder(required);
  const nextOrder = Math.min(curOrder + 1, reqOrder);
  return PLAN_ORDER[Math.max(nextOrder, reqOrder)] || required;
}

export function listSellablePackages(): PackageDefinition[] {
  return PLAN_ORDER.map((id) => PACKAGES[id]).filter((p) => !p.contactSales);
}
