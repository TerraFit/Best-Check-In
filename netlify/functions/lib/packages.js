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
  // Prefer next step after current if it reaches required; else required itself
  const nextOrder = Math.min(curOrder + 1, reqOrder);
  return PLAN_ORDER[Math.max(nextOrder, reqOrder)] || required;
}

export function getPlanPricing(planId, billingCycle = 'monthly') {
  const pkg = getPackage(planId);
  if (pkg.contactSales) return { amount: 0, currency: pkg.currency, contactSales: true };
  const amount = billingCycle === 'yearly' ? pkg.priceYearly : pkg.priceMonthly;
  return { amount, currency: pkg.currency, contactSales: false };
}
