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

export const PLAN_ORDER: PlanType[] = ['starter', 'growth', 'pro', 'business', 'enterprise'];

export const PACKAGES: Record<PlanType, PackageDefinition> = {
  starter: {
    id: 'starter', name: 'Starter', minRooms: 1, maxRooms: null, maxStaff: 3,
    description: 'Professional digital check-in for B&Bs and small-to-medium-sized guest houses.', upgradeOrder: 0,
    priceMonthly: 349, priceYearly: 3839, currency: 'ZAR', popular: false, contactSales: false, color: 'green',
  },
  growth: {
    id: 'growth', name: 'Growth', minRooms: 6, maxRooms: null, maxStaff: 8,
    description: 'Digital check-in plus basic housekeeping and employee portal functionality for growing accommodation businesses.', upgradeOrder: 1,
    priceMonthly: 749, priceYearly: 8239, currency: 'ZAR', popular: true, contactSales: false, color: 'amber',
  },
  pro: {
    id: 'pro', name: 'Pro', minRooms: 11, maxRooms: null, maxStaff: 20,
    description: 'Broader operational management, advanced analytics and marketing intelligence for established accommodation businesses.', upgradeOrder: 2,
    priceMonthly: 1338, priceYearly: 14715, currency: 'ZAR', popular: false, contactSales: false, color: 'blue',
  },
  business: {
    id: 'business', name: 'Business', minRooms: 20, maxRooms: null, maxStaff: null,
    description: 'Complete operational management and unlimited Business Snapshot access for larger establishments.', upgradeOrder: 3,
    priceMonthly: 1911, priceYearly: 21019, currency: 'ZAR', popular: false, contactSales: false, color: 'purple',
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', minRooms: 20, maxRooms: null, maxStaff: null,
    description: 'Elite portfolio management and high-level business intelligence for hotel groups and multi-establishment operators.', upgradeOrder: 4,
    priceMonthly: 2267, priceYearly: 24937, currency: 'ZAR', popular: false, contactSales: false, color: 'stone',
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
 * Legacy Enterprise price helper retained for existing quotation/inquiry flows.
 * The revised room-block pricing in src/config/pricing.ts remains the pricing SSOT.
 */
export function calculateEnterpriseMonthlyPrice(roomCount: number): number {
  const rooms = Math.max(20, Math.ceil(Math.max(1, roomCount) / 5) * 5);
  const roomBlocks = Math.ceil(rooms / 5);
  const roomCapacityBase = roomBlocks * 349;
  let discountRate = 0;
  if (rooms >= 301) discountRate = 0.15;
  else if (rooms >= 101) discountRate = 0.12;
  else if (rooms >= 51) discountRate = 0.10;
  return Math.round((roomCapacityBase * (1 - discountRate) + 871) * 100) / 100;
}
