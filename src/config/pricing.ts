import { MARKET_CONFIG, type MarketRegion } from './markets';

export interface RegionalPlanPrice { monthly: number; yearly: number; }
export interface PricingFxRate { marketRateZarPerUnit: number; bufferPercent: number; pricingRateZarPerUnit: number; effectiveFrom?: string; source?: string; }
export interface RegionalPlanPricing { currency: 'ZAR' | 'USD' | 'EUR'; prices: RegionalPlanPrice[]; billingCurrency: 'ZAR'; exchangeRateVariable: true; }

export const LAST_KNOWN_SAFE_ZAR_PER_USD = 21.23 * 1.05;
export const LAST_KNOWN_SAFE_ZAR_PER_EUR = 18.94 * 1.05;
const FX_RATES_KEY = 'fastcheckin.pricing.fxRates';

function getCachedFxRates(): Partial<Record<'USD' | 'EUR', PricingFxRate>> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(FX_RATES_KEY) || '{}'); } catch { return {}; }
}

import type { FastCheckInPackage } from './pricing-engine';
export type { FastCheckInPackage } from './pricing-engine';
import {
  ROOM_BLOCK_SIZE, ROOM_BLOCK_MONTHLY_PRICE, PACKAGE_MIN_ROOMS, PACKAGE_MONTHLY_SURCHARGES,
  MARKETING_DOWNLOAD_MONTHLY_PRICE, MARKETING_DOWNLOAD_VOUCHER_PRICE,
  MARKETING_DOWNLOAD_VOUCHER_VALIDITY_MONTHS, MARKETING_DOWNLOAD_VOUCHER_DATA_PERIOD_MONTHS,
  packageAcceptsRoomCount, calculateRoomCapacityBase, getBusinessEnterpriseVolumeDiscountRate,
  calculateSubscriptionMonthlyPrice, calculateSubscriptionAnnualPrice,
  calculateEnterpriseMonthlyPrice, calculateEnterprisePortfolioMonthlyPrice,
  calculateEnterprisePortfolioAnnualPrice, calculateEnterpriseAdditionalEstablishmentMonthlyFee,
  calculateMarketingDownloadMonthlyAddon, calculateMarketingDownloadVoucher, getStartingPrice,
} from './pricing-engine';
export {
  ROOM_BLOCK_SIZE, ROOM_BLOCK_MONTHLY_PRICE, PACKAGE_MIN_ROOMS, PACKAGE_MONTHLY_SURCHARGES,
  MARKETING_DOWNLOAD_MONTHLY_PRICE, MARKETING_DOWNLOAD_VOUCHER_PRICE,
  MARKETING_DOWNLOAD_VOUCHER_VALIDITY_MONTHS, MARKETING_DOWNLOAD_VOUCHER_DATA_PERIOD_MONTHS,
  packageAcceptsRoomCount, calculateRoomCapacityBase, getBusinessEnterpriseVolumeDiscountRate,
  calculateSubscriptionMonthlyPrice, calculateSubscriptionAnnualPrice, calculateEnterpriseMonthlyPrice,
  calculateEnterprisePortfolioMonthlyPrice, calculateEnterprisePortfolioAnnualPrice,
  calculateEnterpriseAdditionalEstablishmentMonthlyFee, calculateMarketingDownloadMonthlyAddon,
  calculateMarketingDownloadVoucher, getStartingPrice,
} from './pricing-engine';

export const BASE_ZAR_MONTHLY = (['starter', 'growth', 'pro', 'business', 'enterprise'] as FastCheckInPackage[]).map((plan) => getStartingPrice(plan, 'monthly')) as [number, number, number, number, number];
export const BASE_ZAR_YEARLY = (['starter', 'growth', 'pro', 'business', 'enterprise'] as FastCheckInPackage[]).map((plan) => getStartingPrice(plan, 'yearly')) as [number, number, number, number, number];

export function convertZarToRegionalPrice(
  zarAmount: number,
  region: MarketRegion,
  southAfrican = false,
  fxRates?: Partial<Record<'USD' | 'EUR', PricingFxRate>>,
): number {
  if (southAfrican || region === 'south-africa') return Math.round(zarAmount);
  const config = MARKET_CONFIG[region];
  const rates = fxRates ?? getCachedFxRates();
  const currency = config.currency === 'ZAR' ? 'USD' : config.currency;
  const fallback = currency === 'EUR' ? LAST_KNOWN_SAFE_ZAR_PER_EUR : LAST_KNOWN_SAFE_ZAR_PER_USD;
  const zarPerUnit = rates[currency]?.pricingRateZarPerUnit ?? fallback;
  return Math.round((zarAmount / zarPerUnit) * config.pricingMultiplier);
}

export function getRegionalPricing(
  region: MarketRegion,
  southAfrican = false,
  fxRates?: Partial<Record<'USD' | 'EUR', PricingFxRate>>,
): RegionalPlanPricing {
  if (southAfrican || region === 'south-africa') {
    return { currency: 'ZAR', prices: BASE_ZAR_MONTHLY.map((monthly, index) => ({ monthly, yearly: BASE_ZAR_YEARLY[index] })), billingCurrency: 'ZAR', exchangeRateVariable: true };
  }
  const config = MARKET_CONFIG[region];
  const monthlyPrices = BASE_ZAR_MONTHLY.map((monthly) => convertZarToRegionalPrice(monthly, region, false, fxRates));
  return { currency: config.currency, prices: monthlyPrices.map((monthly) => ({ monthly, yearly: monthly * 11 })), billingCurrency: 'ZAR', exchangeRateVariable: true };
}
