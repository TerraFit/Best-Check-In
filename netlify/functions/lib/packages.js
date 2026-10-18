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
    description: 'Professional digital check-in for B&Bs and small-to-medium-sized guest houses.',
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
    description: 'Digital check-in plus basic housekeeping and employee portal functionality for growing accommodation businesses.',
    upgradeOrder: 1,
    priceMonthly: 749,
    priceYearly: 8239,
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
    description: 'Broader operational management, advanced analytics and marketing intelligence for established accommodation businesses.',
    upgradeOrder: 2,
    priceMonthly: 1338,
    priceYearly: 14715,
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
    description: 'Complete operational management and unlimited Business Snapshot access for larger establishments.',
    upgradeOrder: 3,
    priceMonthly: 1911,
    priceYearly: 21019,
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
    description: 'Elite portfolio management and high-level business intelligence for hotel groups and multi-establishment operators.',
    upgradeOrder: 4,
    priceMonthly: 2267,
    priceYearly: 24937,
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

export function planSatisfies(currentPlan, requiredPlan) {
  return getUpgradeOrder(currentPlan) >= getUpgradeOrder(requiredPlan);
}

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
