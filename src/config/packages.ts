/**
 * Package SSOT — package metadata is kept here, while all pricing rules live in pricing.ts.
 */

import {
  calculateSubscriptionAnnualPrice,
  calculateSubscriptionMonthlyPrice,
  type FastCheckInPackage,
} from './pricing';

export type PlanType = FastCheckInPackage;

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

export const PLAN_ORDER: PlanType[] = ['starter', 'growth', 'pro', 'business', 'enterprise'];

const packageMeta: Record<PlanType, Omit<PackageDefinition, 'priceMonthly' | 'priceYearly' | 'minRooms'>> = {
  starter: {
    id: 'starter', name: 'Starter', maxRooms: null, maxStaff: 3,
    description: 'Professional digital check-in for B&Bs and small-to-medium-sized guest houses.', upgradeOrder: 0,
    currency: 'ZAR', popular: false, contactSales: false, color: 'green',
  },
  growth: {
    id: 'growth', name: 'Growth', maxRooms: null, maxStaff: 8,
    description: 'Digital check-in plus basic housekeeping and employee portal functionality for growing accommodation businesses.', upgradeOrder: 1,
    currency: 'ZAR', popular: true, contactSales: false, color: 'amber',
  },
  pro: {
    id: 'pro', name: 'Pro', maxRooms: null, maxStaff: 20,
    description: 'Broader operational management, advanced analytics and marketing intelligence for established accommodation businesses.', upgradeOrder: 2,
    currency: 'ZAR', popular: false, contactSales: false, color: 'blue',
  },
  business: {
    id: 'business', name: 'Business', maxRooms: null, maxStaff: null,
    description: 'Complete operational management and unlimited Business Snapshot access for larger establishments.', upgradeOrder: 3,
    currency: 'ZAR', popular: false, contactSales: false, color: 'purple',
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', maxRooms: null, maxStaff: null,
    description: 'Elite portfolio management and high-level business intelligence for hotel groups and multi-establishment operators.', upgradeOrder: 4,
    currency: 'ZAR', popular: false, contactSales: false, color: 'stone',
  },
};

export const PACKAGES: Record<PlanType, PackageDefinition> = Object.fromEntries(
  PLAN_ORDER.map((id) => {
    const meta = packageMeta[id];
    const minRooms = {
      starter: 1,
      growth: 6,
      pro: 11,
      business: 20,
      enterprise: 20,
    }[id];
    return [id, {
      ...meta,
      minRooms,
      priceMonthly: calculateSubscriptionMonthlyPrice(minRooms, id),
      priceYearly: calculateSubscriptionAnnualPrice(minRooms, id),
    }];
  }),
) as Record<PlanType, PackageDefinition>;

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

export function recommendUpgrade(currentPlan?: string | null, requiredPlan?: string | null): PlanType {
  const current = normalizePlanId(currentPlan);
  const required = normalizePlanId(requiredPlan);
  if (planSatisfies(current, required)) return current;
  const curOrder = getUpgradeOrder(current);
  const reqOrder = getUpgradeOrder(required);
  const nextOrder = Math.min(curOrder + 1, reqOrder);
  return PLAN_ORDER[Math.max(nextOrder, reqOrder)] || required;
}

export function listSellablePackages(): PackageDefinition[] {
  return PLAN_ORDER.map((id) => PACKAGES[id]);
}

/**
 * Compatibility helper for existing quotation/inquiry flows.
 * Revised room-block pricing remains defined in pricing.ts.
 */
export { calculateEnterpriseMonthlyPrice } from './pricing';
