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

/** Package price rules are implemented once in the shared JS engine used by browser and Netlify. */
export type { FastCheckInPackage } from './pricing-engine';
import {
  ROOM_BLOCK_SIZE,
  ROOM_BLOCK_MONTHLY_PRICE,
  PACKAGE_MIN_ROOMS,
  PACKAGE_MONTHLY_SURCHARGES,
  MARKETING_DOWNLOAD_MONTHLY_PRICE,
  MARKETING_DOWNLOAD_VOUCHER_PRICE,
  MARKETING_DOWNLOAD_VOUCHER_VALIDITY_MONTHS,
  MARKETING_DOWNLOAD_VOUCHER_DATA_PERIOD_MONTHS,
  packageAcceptsRoomCount,
  calculateRoomCapacityBase,
  getBusinessEnterpriseVolumeDiscountRate,
  calculateSubscriptionMonthlyPrice,
  calculateSubscriptionAnnualPrice,
  calculateEnterpriseMonthlyPrice,
  calculateEnterpriseAdditionalEstablishmentMonthlyFee,
  calculateMarketingDownloadMonthlyAddon,
  calculateMarketingDownloadVoucher,
  type FastCheckInPackage,
} from './pricing-engine';
export {
  ROOM_BLOCK_SIZE, ROOM_BLOCK_MONTHLY_PRICE, PACKAGE_MIN_ROOMS, PACKAGE_MONTHLY_SURCHARGES,
  MARKETING_DOWNLOAD_MONTHLY_PRICE, MARKETING_DOWNLOAD_VOUCHER_PRICE,
  MARKETING_DOWNLOAD_VOUCHER_VALIDITY_MONTHS, MARKETING_DOWNLOAD_VOUCHER_DATA_PERIOD_MONTHS,
  packageAcceptsRoomCount, calculateRoomCapacityBase, getBusinessEnterpriseVolumeDiscountRate,
  calculateSubscriptionMonthlyPrice, calculateSubscriptionAnnualPrice, calculateEnterpriseMonthlyPrice,
  calculateEnterpriseAdditionalEstablishmentMonthlyFee, calculateMarketingDownloadMonthlyAddon,
  calculateMarketingDownloadVoucher,
};

/** Initial Africa international price ladder, derived from the revised public starting-price ladder. */
export const BASE_AFRICA_USD_MONTHLY = [20, 40, 55, 75, 99] as const;

/** Europe uses the agreed commercial planning rate of R20 = €1. */
export const EURO_PLANNING_RATE_ZAR_PER_EUR = 20;

const roundCurrency = (value: number) => Math.round(value);

export function getRegionalPricing(region: MarketRegion, southAfrican = false): RegionalPlanPricing {
  if (southAfrican) {
    return {
      currency: 'ZAR',
      prices: BASE_ZAR_MONTHLY.map((monthly, index) => ({ monthly, yearly: BASE_ZAR_YEARLY[index] })),
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
