import { MARKET_CONFIG, type MarketRegion } from './markets';

export interface RegionalPlanPrice {
  monthly: number;
  yearly: number;
}

export interface RegionalPlanPricing {
  currency: 'ZAR' | 'USD' | 'EUR';
  prices: RegionalPlanPrice[];
  billingCurrency: 'ZAR';
  exchangeRateVariable: true;
}

/** Current South African commercial prices. */
export const BASE_ZAR_MONTHLY = [349, 797, 1190, 1589, 1975] as const;

/** Initial Africa international price ladder. */
export const BASE_AFRICA_USD_MONTHLY = [20, 40, 55, 75, 99] as const;

/** Europe uses the agreed commercial planning rate of R20 = €1. */
export const EURO_PLANNING_RATE_ZAR_PER_EUR = 20;

const roundCurrency = (value: number) => Math.round(value);

export function getRegionalPricing(region: MarketRegion, southAfrican = false): RegionalPlanPricing {
  if (southAfrican) {
    return {
      currency: 'ZAR',
      prices: BASE_ZAR_MONTHLY.map((monthly) => ({ monthly, yearly: monthly * 11 })),
      billingCurrency: 'ZAR',
      exchangeRateVariable: true,
    };
  }

  const config = MARKET_CONFIG[region];

  const monthly = region === 'europe'
    ? BASE_ZAR_MONTHLY.map((zar) => roundCurrency((zar / EURO_PLANNING_RATE_ZAR_PER_EUR) * config.pricingMultiplier))
    : BASE_AFRICA_USD_MONTHLY.map((usd) => roundCurrency(usd * config.pricingMultiplier));

  return {
    currency: config.currency,
    prices: monthly.map((value) => ({ monthly: value, yearly: value * 11 })),
    billingCurrency: 'ZAR',
    exchangeRateVariable: true,
  };
}


/**
 * Private revised pricing rules. These calculations are intentionally not displayed
 * as live public quotations until the pricing release is approved.
 */
export type FastCheckInPackage = 'starter' | 'growth' | 'pro' | 'business' | 'enterprise';

export const ROOM_BLOCK_SIZE = 5;
export const ROOM_BLOCK_MONTHLY_PRICE = 349;

export const PACKAGE_MONTHLY_SURCHARGES: Record<FastCheckInPackage, number> = {
  starter: 0,
  growth: 51,
  pro: 290.70,
  business: 514.80,
  // Business feature bundle at its R572 standalone value + R299 Enterprise setup.
  enterprise: 871,
};

export function calculateRoomCapacityBase(rooms: number): number {
  const safeRooms = Math.max(1, Math.ceil(Number.isFinite(rooms) ? rooms : 1));
  return Math.ceil(safeRooms / ROOM_BLOCK_SIZE) * ROOM_BLOCK_MONTHLY_PRICE;
}

/**
 * Apply an already-determined eligible volume discount to room capacity only.
 * Feature surcharges are fixed per establishment and are never multiplied by blocks.
 */
/** Returns the eligible Business/Enterprise room-capacity discount for a portfolio. */
export function getBusinessEnterpriseVolumeDiscountRate(eligiblePortfolioRooms: number): number {
  if (eligiblePortfolioRooms >= 301) return 0.15;
  if (eligiblePortfolioRooms >= 101) return 0.12;
  if (eligiblePortfolioRooms >= 51) return 0.10;
  return 0;
}

export function calculateSubscriptionMonthlyPrice(
  rooms: number,
  packageName: FastCheckInPackage,
  roomCapacityDiscountRate = 0,
): number {
  // Volume discounts apply only to Business/Enterprise room-capacity charges.
  const isVolumeEligible = packageName === 'business' || packageName === 'enterprise';
  const discountRate = isVolumeEligible
    ? Math.min(1, Math.max(0, roomCapacityDiscountRate))
    : 0;
  const discountedRoomBase = calculateRoomCapacityBase(rooms) * (1 - discountRate);
  return Math.round((discountedRoomBase + PACKAGE_MONTHLY_SURCHARGES[packageName]) * 100) / 100;
}

export function calculateSubscriptionAnnualPrice(
  rooms: number,
  packageName: FastCheckInPackage,
  roomCapacityDiscountRate = 0,
): number {
  return Math.round(calculateSubscriptionMonthlyPrice(rooms, packageName, roomCapacityDiscountRate) * 11 * 100) / 100;
}

/** Enterprise establishment fees are separate from room and package pricing. */
export function calculateEnterpriseAdditionalEstablishmentMonthlyFee(establishmentNumber: number): number {
  if (!Number.isInteger(establishmentNumber) || establishmentNumber < 3) return 0;
  if (establishmentNumber <= 5) return Math.round(299 * 0.85 * 100) / 100;
  return 199;
}
