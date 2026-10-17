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
    description: 'Replace paper. Digitise reception. Ensure legal compliance.', upgradeOrder: 0,
    priceMonthly: 349, priceYearly: 3839, currency: 'ZAR', popular: false, contactSales: false, color: 'green',
  },
  growth: {
    id: 'growth', name: 'Growth', minRooms: 6, maxRooms: null, maxStaff: 8,
    description: 'Improve daily operations, staff capacity, and country-level insight.', upgradeOrder: 1,
    priceMonthly: 797, priceYearly: 8767, currency: 'ZAR', popular: true, contactSales: false, color: 'amber',
  },
  pro: {
    id: 'pro', name: 'Pro', minRooms: 11, maxRooms: null, maxStaff: 20,
    description: 'Professional management: audit, advanced reporting, regional analytics and Marketing Download.', upgradeOrder: 2,
    priceMonthly: 1049, priceYearly: 11539, currency: 'ZAR', popular: false, contactSales: false, color: 'blue',
  },
  business: {
    id: 'business', name: 'Business', minRooms: 20, maxRooms: null, maxStaff: null,
    description: 'Manage multiple establishments from one hospitality business dashboard.', upgradeOrder: 3,
    priceMonthly: 1429, priceYearly: 15719, currency: 'ZAR', popular: false, contactSales: false, color: 'purple',
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', minRooms: 20, maxRooms: null, maxStaff: null,
    description: 'Enterprise portfolio management with scalable room capacity and Marketing Download included.', upgradeOrder: 4,
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
 * Room capacity is calculated separately in 5-room blocks under the revised pricing model.
 * Volume discounts apply to eligible room-capacity charges, not package feature surcharges.
 */
export function calculateEnterpriseMonthlyPrice(roomCount: number): number {
  const rooms = Math.max(20, Math.ceil(roomCount / 5) * 5);
  const blocks = Math.ceil(rooms / 5);
  const base = blocks * 349;
  const surcharge = 871;
  return Math.round((base + surcharge) * 100) / 100;
}
