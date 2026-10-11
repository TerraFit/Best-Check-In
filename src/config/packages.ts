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
    id: 'starter', name: 'Starter', minRooms: 1, maxRooms: 5, maxStaff: 3,
    description: 'Replace paper. Digitise reception. Ensure legal compliance.', upgradeOrder: 0,
    priceMonthly: 349, priceYearly: 3839, currency: 'ZAR', popular: false, contactSales: false, color: 'green',
  },
  growth: {
    id: 'growth', name: 'Growth', minRooms: 6, maxRooms: 10, maxStaff: 8,
    description: 'Improve daily operations, staff capacity, and country-level insight.', upgradeOrder: 1,
    priceMonthly: 797, priceYearly: 8767, currency: 'ZAR', popular: true, contactSales: false, color: 'amber',
  },
  pro: {
    id: 'pro', name: 'Pro', minRooms: 11, maxRooms: 15, maxStaff: 20,
    description: 'Professional management: audit, advanced reporting, regional analytics.', upgradeOrder: 2,
    priceMonthly: 1049, priceYearly: 11539, currency: 'ZAR', popular: false, contactSales: false, color: 'blue',
  },
  business: {
    id: 'business', name: 'Business', minRooms: 16, maxRooms: 20, maxStaff: null,
    description: 'Manage multiple establishments from one hospitality business dashboard.', upgradeOrder: 3,
    priceMonthly: 1429, priceYearly: 15719, currency: 'ZAR', popular: false, contactSales: false, color: 'purple',
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', minRooms: 25, maxRooms: null, maxStaff: null,
    description: 'Enterprise pricing from R1,698/month per establishment, with capacity-based volume discounts.', upgradeOrder: 4,
    priceMonthly: 1698, priceYearly: 1698 * 11, currency: 'ZAR', popular: false, contactSales: false, color: 'stone',
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
 * Enterprise establishment pricing.
 * Base price covers up to 25 rooms. Additional capacity is sold in 5-room blocks.
 * Volume discounts apply to the additional blocks within each room bracket.
 * The calculation is per establishment, never pooled across a group.
 */
export function calculateEnterpriseMonthlyPrice(roomCount: number): number {
  const rooms = Math.max(25, Math.ceil(roomCount / 5) * 5);
  if (rooms <= 25) return 1698;

  const blocks = (rooms - 25) / 5;
  let price = 1698;

  for (let block = 1; block <= blocks; block += 1) {
    const roomStart = 26 + (block - 1) * 5;
    const discount = roomStart >= 301 ? 0.15 : roomStart >= 101 ? 0.12 : roomStart >= 51 ? 0.10 : 0;
    price += 349 * (1 - discount);
  }

  return Math.round(price);
}
