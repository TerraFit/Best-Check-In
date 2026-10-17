/**
 * Package SSOT (Netlify mirror — keep in sync with src/config/packages.ts)
 * Technical debt: replace with shared module when available.
 */

export const PLAN_ORDER = ['starter', 'growth', 'pro', 'business', 'enterprise'];

export const PACKAGES = {
  starter: {
    id: 'starter',
    name: 'Starter',
    minRooms: 1,
    maxRooms: null,
    maxStaff: 3,
    description: 'Replace paper. Digitise reception. Ensure legal compliance.',
    upgradeOrder: 0,
    priceMonthly: 349,
    priceYearly: 3839,
    currency: 'ZAR',
    popular: false,
    contactSales: false,
    color: 'green',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    minRooms: 6,
    maxRooms: null,
    maxStaff: 8,
    description: 'Improve daily operations, staff capacity, and country-level insight.',
    upgradeOrder: 1,
    priceMonthly: 797,
    priceYearly: 8767,
    currency: 'ZAR',
    popular: true,
    contactSales: false,
    color: 'amber',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    minRooms: 11,
    maxRooms: null,
    maxStaff: 20,
    description: 'Professional management: audit, advanced reporting, regional analytics and Marketing Download.',
    upgradeOrder: 2,
    priceMonthly: 1049,
    priceYearly: 11539,
    currency: 'ZAR',
    popular: false,
    contactSales: false,
    color: 'blue',
  },
  business: {
    id: 'business',
    name: 'Business',
    minRooms: 20,
    maxRooms: null,
    maxStaff: null,
    description: 'Manage multiple establishments from one hospitality business dashboard.',
    upgradeOrder: 3,
    priceMonthly: 1429,
    priceYearly: 15719,
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
    description: 'Enterprise portfolio management with scalable room capacity and Marketing Download included.',
    upgradeOrder: 4,
    priceMonthly: 1698,
    priceYearly: 18678,
    currency: 'ZAR',
    popular: false,
    contactSales: false,
    color: 'stone',
  },
};

export function normalizePlanId(plan) {
  if (!plan || typeof plan !== 'string') return 'starter';
  const id = plan.toLowerCase().trim();
  return PACKAGES[id] ? id : 'starter';
}

export function getPackage(planId) {
  return PACKAGES[normalizePlanId(planId)];
}

export function getUpgradeOrder(planId) {
  return getPackage(planId).upgradeOrder;
}

/** True if current plan is at least as high as required. */
export function planSatisfies(currentPlan, requiredPlan) {
  return getUpgradeOrder(currentPlan) >= getUpgradeOrder(requiredPlan);
}

/** Next logical package (never skips unless required is higher than next). */
export function recommendUpgrade(currentPlan, requiredPlan) {
  const current = normalizePlanId(currentPlan);
  const required = normalizePlanId(requiredPlan);
  if (planSatisfies(current, required)) return current;
  const curOrder = getUpgradeOrder(current);
  const reqOrder = getUpgradeOrder(required);
  const nextOrder = Math.min(curOrder + 1, reqOrder);
  return PLAN_ORDER[Math.max(nextOrder, reqOrder)] || required;
}

export function getPlanPricing(planId, billingCycle = 'monthly') {
  const pkg = getPackage(planId);
  if (pkg.contactSales) return { amount: 0, currency: pkg.currency, contactSales: true };
  const amount = billingCycle === 'yearly' ? pkg.priceYearly : pkg.priceMonthly;
  return { amount, currency: pkg.currency, contactSales: false };
}
