export type MarketRegion = 'south-africa' | 'africa' | 'europe' | 'north-america' | 'south-america' | 'middle-east' | 'asia' | 'oceania';

export interface MarketConfig {
  region: MarketRegion;
  name: string;
  currency: 'ZAR' | 'USD' | 'EUR';
  pricingMultiplier: number;
}

export const MARKET_CONFIG: Record<MarketRegion, MarketConfig> = {
  'south-africa': { region: 'south-africa', name: 'South Africa', currency: 'ZAR', pricingMultiplier: 1 },
  africa: { region: 'africa', name: 'Africa', currency: 'USD', pricingMultiplier: 1 },
  europe: { region: 'europe', name: 'Europe', currency: 'EUR', pricingMultiplier: 1.3 },
  'north-america': { region: 'north-america', name: 'North America', currency: 'USD', pricingMultiplier: 1.3 },
  'south-america': { region: 'south-america', name: 'South America', currency: 'USD', pricingMultiplier: 1.1 },
  'middle-east': { region: 'middle-east', name: 'Middle East', currency: 'USD', pricingMultiplier: 1.2 },
  asia: { region: 'asia', name: 'Asia', currency: 'USD', pricingMultiplier: 1.15 },
  oceania: { region: 'oceania', name: 'Oceania', currency: 'USD', pricingMultiplier: 1.3 },
};

const COUNTRY_REGION: Record<string, MarketRegion> = {
  ZA: 'south-africa',
  NG: 'africa', KE: 'africa', GH: 'africa', EG: 'africa', MA: 'africa', TZ: 'africa', NA: 'africa', BW: 'africa', ZM: 'africa',
  US: 'north-america', CA: 'north-america', MX: 'north-america', CR: 'north-america', PA: 'north-america', GT: 'north-america', HN: 'north-america', SV: 'north-america', NI: 'north-america', BZ: 'north-america',
  CU: 'north-america', DO: 'north-america', HT: 'north-america', JM: 'north-america', TT: 'north-america', BS: 'north-america', BB: 'north-america', PR: 'north-america',
  BR: 'south-america', AR: 'south-america', CL: 'south-america', CO: 'south-america', PE: 'south-america', UY: 'south-america', EC: 'south-america', VE: 'south-america', BO: 'south-america', PY: 'south-america', GY: 'south-america', SR: 'south-america',
  AE: 'middle-east', SA: 'middle-east', QA: 'middle-east', BH: 'middle-east', KW: 'middle-east', OM: 'middle-east', JO: 'middle-east', IL: 'middle-east', IQ: 'middle-east', YE: 'middle-east', PS: 'middle-east', TR: 'middle-east',
  AU: 'oceania', NZ: 'oceania', FJ: 'oceania', PG: 'oceania', WS: 'oceania', TO: 'oceania', VU: 'oceania',
  JP: 'asia', CN: 'asia', IN: 'asia', SG: 'asia', ID: 'asia', TH: 'asia', MY: 'asia', PH: 'asia', VN: 'asia', KR: 'asia', PK: 'asia', BD: 'asia', LK: 'asia', NP: 'asia', KH: 'asia', LA: 'asia', MM: 'asia', MN: 'asia', KZ: 'asia', UZ: 'asia',
  DE: 'europe', FR: 'europe', GB: 'europe', IT: 'europe', ES: 'europe', PT: 'europe', NL: 'europe', CH: 'europe', AT: 'europe', BE: 'europe', SE: 'europe', NO: 'europe', DK: 'europe', FI: 'europe', IE: 'europe', PL: 'europe', CZ: 'europe', SK: 'europe', HU: 'europe', RO: 'europe', BG: 'europe', GR: 'europe', HR: 'europe', SI: 'europe', RS: 'europe', UA: 'europe', RU: 'europe', IS: 'europe', LU: 'europe', MT: 'europe', CY: 'europe', EE: 'europe', LV: 'europe', LT: 'europe', AL: 'europe', MK: 'europe', ME: 'europe', BA: 'europe', MD: 'europe',
};

export function regionForCountry(countryCode?: string | null): MarketRegion | null {
  const normalized = (countryCode || '').toUpperCase();
  return COUNTRY_REGION[normalized] || null;
}

export function isSouthAfrica(countryCode?: string | null): boolean {
  return (countryCode || '').toUpperCase() === 'ZA';
}
