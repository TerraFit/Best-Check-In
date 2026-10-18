/** Package metadata for Netlify; all price calculations come from the shared engine. */
import {
  PACKAGE_MIN_ROOMS,
  calculateSubscriptionMonthlyPrice,
  calculateSubscriptionAnnualPrice,
  getBusinessEnterpriseVolumeDiscountRate,
  getStartingPrice,
  packageAcceptsRoomCount,
} from '../../../src/config/pricing-engine.js';

export const PLAN_ORDER = ['starter', 'growth', 'pro', 'business', 'enterprise'];

export const PACKAGES = {
  starter: {
    id: 'starter',
    name: 'Starter',
    minRooms: PACKAGE_MIN_ROOMS.starter,
    maxRooms: null,
    maxStaff: 3,
    description: 'Professional digital check-in for B&Bs and small-to-medium-sized guest houses.',
    upgradeOrder: 0,
    priceMonthly: getStartingPrice('starter', 'monthly'),
    priceYearly: getStartingPrice('starter', 'yearly'),
    currency: 'ZAR',
    popular: false,
    contactSales: false,
    color: 'green',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    minRooms: PACKAGE_MIN_ROOMS.growth,
    maxRooms: null,
    maxStaff: 8,
    description: 'Digital check-in plus basic housekeeping and employee portal functionality for growing accommodation businesses.',
    upgradeOrder: 1,
    priceMonthly: getStartingPrice('growth', 'monthly'),
    priceYearly: getStartingPrice('growth', 'yearly'),
    currency: 'ZAR',
    popular: true,
    contactSales: false,
    color: 'amber',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    minRooms: PACKAGE_MIN_ROOMS.pro,
    maxRooms: null,
    maxStaff: 20,
    description: 'Broader operational management, advanced analytics and marketing intelligence for established accommodation businesses.',
    upgradeOrder: 2,
    priceMonthly: getStartingPrice('pro', 'monthly'),
    priceYearly: getStartingPrice('pro', 'yearly'),
    currency: 'ZAR',
    popular: false,
    contactSales: false,
    color: 'blue',
  },
  business: {
    id: 'business',
    name: 'Business',
    minRooms: PACKAGE_MIN_ROOMS.business,
    maxRooms: null,
    maxStaff: null,
    description: 'Complete operational management and unlimited Business Snapshot access for larger establishments.',
    upgradeOrder: 3,
    priceMonthly: getStartingPrice('business', 'monthly'),
    priceYearly: getStartingPrice('business', 'yearly'),
    currency: 'ZAR',
    popular: false,
    contactSales: false,
    color: 'purple',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    minRooms: PACKAGE_MIN_ROOMS.enterprise,
    maxRooms: null,
    maxStaff: null,
    description: 'Elite portfolio management and high-level business intelligence for hotel groups and multi-establishment operators.',
    upgradeOrder: 4,
    priceMonthly: getStartingPrice('enterprise', 'monthly'),
    priceYearly: getStartingPrice('enterprise', 'yearly'),
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

export function getPlanPricing(planId, billingCycle = 'monthly', rooms = null, explicitDiscountRate = null) {
  const pkg = getPackage(planId);
  if (pkg.contactSales) return { amount: 0, currency: pkg.currency, contactSales: true };
  const roomCount = rooms === null || rooms === undefined
    ? pkg.minRooms
    : Math.max(1, Math.ceil(Number.isFinite(Number(rooms)) ? Number(rooms) : 1));
  if (!packageAcceptsRoomCount(pkg.id, roomCount)) {
    return { amount: 0, currency: pkg.currency, contactSales: false, rooms: roomCount, discountRate: 0 };
  }
  const discountRate = explicitDiscountRate === null
    ? ((pkg.id === 'business' || pkg.id === 'enterprise') ? getBusinessEnterpriseVolumeDiscountRate(roomCount) : 0)
    : explicitDiscountRate;
  const amount = billingCycle === 'yearly'
    ? calculateSubscriptionAnnualPrice(roomCount, pkg.id, discountRate)
    : calculateSubscriptionMonthlyPrice(roomCount, pkg.id, discountRate);
  return { amount, currency: pkg.currency, contactSales: false, rooms: roomCount, discountRate };
}
