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
export const BASE_ZAR_MONTHLY = [349, 797, 1049, 1429] as const;

/** Initial Africa international price ladder. */
export const BASE_AFRICA_USD_MONTHLY = [20, 40, 55, 75] as const;

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
