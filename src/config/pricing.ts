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

/**
 * Existing South African commercial prices.
 * International pricing is derived from these base values and the
 * regional pricing structure below, without changing the SA price list.
 */
export const BASE_ZAR_MONTHLY = [349, 649, 949, 1290] as const;

/**
 * Initial Africa international price ladder. Regional multipliers are
 * applied to these prices for all non-European markets.
 */
export const BASE_AFRICA_USD_MONTHLY = [20, 35, 50, 70] as const;

/**
 * Europe uses the agreed commercial planning rate of R20 = €1,
 * applied to the ZAR base and then multiplied by Europe's 1.30 factor.
 */
export const EURO_PLANNING_RATE_ZAR_PER_EUR = 20;

const roundCurrency = (value: number) => Math.round(value);

export function getRegionalPricing(region: MarketRegion, southAfrican = false): RegionalPlanPricing {
  if (southAfrican) {
    return {
      currency: 'ZAR',
      prices: BASE_ZAR_MONTHLY.map((monthly) => ({ monthly, yearly: monthly * 10 })),
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
    prices: monthly.map((value) => ({ monthly: value, yearly: value * 10 })),
    billingCurrency: 'ZAR',
    exchangeRateVariable: true,
  };
}
