export type MarketRegion = 'africa' | 'europe' | 'north-america' | 'south-america' | 'middle-east' | 'asia' | 'oceania';

export interface MarketConfig {
  region: MarketRegion;
  name: string;
  currency: 'USD' | 'EUR';
  pricingMultiplier: number;
}

export const MARKET_CONFIG: Record<MarketRegion, MarketConfig> = {
  africa: { region: 'africa', name: 'Africa', currency: 'USD', pricingMultiplier: 1 },
  europe: { region: 'europe', name: 'Europe', currency: 'EUR', pricingMultiplier: 1.3 },
  'north-america': { region: 'north-america', name: 'North America', currency: 'USD', pricingMultiplier: 1.3 },
  'south-america': { region: 'south-america', name: 'South America', currency: 'USD', pricingMultiplier: 1.1 },
  'middle-east': { region: 'middle-east', name: 'Middle East', currency: 'USD', pricingMultiplier: 1.2 },
  asia: { region: 'asia', name: 'Asia', currency: 'USD', pricingMultiplier: 1.15 },
  oceania: { region: 'oceania', name: 'Oceania', currency: 'USD', pricingMultiplier: 1.3 },
};

const COUNTRY_REGION: Record<string, MarketRegion> = {
  ZA: 'africa', NG: 'africa', KE: 'africa', GH: 'africa', EG: 'africa', MA: 'africa', TZ: 'africa', NA: 'africa', BW: 'africa', ZM: 'africa',
  US: 'north-america', CA: 'north-america',
  BR: 'south-america', AR: 'south-america', CL: 'south-america', CO: 'south-america', PE: 'south-america', UY: 'south-america', EC: 'south-america',
  AE: 'middle-east', SA: 'middle-east', QA: 'middle-east', BH: 'middle-east', KW: 'middle-east', OM: 'middle-east', JO: 'middle-east', IL: 'middle-east',
  AU: 'oceania', NZ: 'oceania',
  JP: 'asia', CN: 'asia', IN: 'asia', SG: 'asia', ID: 'asia', TH: 'asia', MY: 'asia', PH: 'asia', VN: 'asia', KR: 'asia',
  DE: 'europe', FR: 'europe', GB: 'europe', IT: 'europe', ES: 'europe', PT: 'europe', NL: 'europe', CH: 'europe', AT: 'europe', BE: 'europe', SE: 'europe', NO: 'europe', DK: 'europe', FI: 'europe', IE: 'europe',
};

export function regionForCountry(countryCode?: string | null): MarketRegion {
  return COUNTRY_REGION[(countryCode || '').toUpperCase()] || 'africa';
}

export function isSouthAfrica(countryCode?: string | null): boolean {
  return (countryCode || '').toUpperCase() === 'ZA';
}
