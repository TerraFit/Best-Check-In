/**
 * Canonical geo hierarchy for FastCheckIn Analytics Intelligence.
 * Single source of truth — do not duplicate continent/ISO maps elsewhere.
 */

import {
  resolveCountryAlias,
  resolveProvinceAlias,
  resolveCityAlias,
} from './locationAliases.js';

export const CONTINENTS = [
  'Africa',
  'Europe',
  'North America',
  'South America',
  'Asia',
  'Oceania',
  'Other',
];

/** Country name (as stored on bookings) → continent */
export const COUNTRY_TO_CONTINENT = {
  'South Africa': 'Africa',
  Namibia: 'Africa',
  Botswana: 'Africa',
  Zimbabwe: 'Africa',
  Mozambique: 'Africa',
  Lesotho: 'Africa',
  Eswatini: 'Africa',
  Zambia: 'Africa',
  Angola: 'Africa',
  Malawi: 'Africa',
  Tanzania: 'Africa',
  Kenya: 'Africa',
  Nigeria: 'Africa',
  Ghana: 'Africa',
  Egypt: 'Africa',
  Morocco: 'Africa',
  Tunisia: 'Africa',
  Algeria: 'Africa',
  Mauritius: 'Africa',
  Seychelles: 'Africa',
  Rwanda: 'Africa',
  Uganda: 'Africa',
  Ethiopia: 'Africa',
  Congo: 'Africa',
  'Democratic Republic of the Congo': 'Africa',
  Sudan: 'Africa',
  Germany: 'Europe',
  France: 'Europe',
  'United Kingdom': 'Europe',
  UK: 'Europe',
  Italy: 'Europe',
  Spain: 'Europe',
  Netherlands: 'Europe',
  Switzerland: 'Europe',
  Austria: 'Europe',
  Belgium: 'Europe',
  Portugal: 'Europe',
  Sweden: 'Europe',
  Norway: 'Europe',
  Denmark: 'Europe',
  Finland: 'Europe',
  Greece: 'Europe',
  Ireland: 'Europe',
  Poland: 'Europe',
  Russia: 'Europe',
  Turkey: 'Europe',
  'Czech Republic': 'Europe',
  Czechia: 'Europe',
  Hungary: 'Europe',
  Romania: 'Europe',
  Bulgaria: 'Europe',
  Croatia: 'Europe',
  Ukraine: 'Europe',
  'United States': 'North America',
  USA: 'North America',
  'United States of America': 'North America',
  Canada: 'North America',
  Mexico: 'North America',
  Brazil: 'South America',
  Argentina: 'South America',
  Chile: 'South America',
  Colombia: 'South America',
  Peru: 'South America',
  Venezuela: 'South America',
  China: 'Asia',
  India: 'Asia',
  Japan: 'Asia',
  'South Korea': 'Asia',
  Singapore: 'Asia',
  Malaysia: 'Asia',
  Indonesia: 'Asia',
  Thailand: 'Asia',
  Vietnam: 'Asia',
  Philippines: 'Asia',
  UAE: 'Asia',
  'United Arab Emirates': 'Asia',
  'Saudi Arabia': 'Asia',
  Israel: 'Asia',
  Pakistan: 'Asia',
  Bangladesh: 'Asia',
  Australia: 'Oceania',
  'New Zealand': 'Oceania',
  Fiji: 'Oceania',
};

export const COUNTRY_ISO = {
  'South Africa': 'ZA',
  Namibia: 'NA',
  Botswana: 'BW',
  Zimbabwe: 'ZW',
  Mozambique: 'MZ',
  Lesotho: 'LS',
  Eswatini: 'SZ',
  Zambia: 'ZM',
  Angola: 'AO',
  Malawi: 'MW',
  Tanzania: 'TZ',
  Kenya: 'KE',
  Nigeria: 'NG',
  Ghana: 'GH',
  Egypt: 'EG',
  Morocco: 'MA',
  Tunisia: 'TN',
  Algeria: 'DZ',
  Germany: 'DE',
  France: 'FR',
  'United Kingdom': 'GB',
  UK: 'GB',
  Italy: 'IT',
  Spain: 'ES',
  Netherlands: 'NL',
  Switzerland: 'CH',
  Austria: 'AT',
  Belgium: 'BE',
  Portugal: 'PT',
  Sweden: 'SE',
  Norway: 'NO',
  Denmark: 'DK',
  Finland: 'FI',
  Greece: 'GR',
  Ireland: 'IE',
  Poland: 'PL',
  Russia: 'RU',
  Turkey: 'TR',
  'Czech Republic': 'CZ',
  Czechia: 'CZ',
  Hungary: 'HU',
  Romania: 'RO',
  Bulgaria: 'BG',
  Croatia: 'HR',
  Ukraine: 'UA',
  'United States': 'US',
  USA: 'US',
  'United States of America': 'US',
  Canada: 'CA',
  Mexico: 'MX',
  Brazil: 'BR',
  Argentina: 'AR',
  Chile: 'CL',
  Colombia: 'CO',
  Peru: 'PE',
  Venezuela: 'VE',
  China: 'CN',
  India: 'IN',
  Japan: 'JP',
  'South Korea': 'KR',
  Singapore: 'SG',
  Malaysia: 'MY',
  Indonesia: 'ID',
  Thailand: 'TH',
  Vietnam: 'VN',
  Philippines: 'PH',
  UAE: 'AE',
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
  Israel: 'IL',
  Pakistan: 'PK',
  Bangladesh: 'BD',
  Australia: 'AU',
  'New Zealand': 'NZ',
  Fiji: 'FJ',
  'Democratic Republic of the Congo': 'CD',
};

/** South African provinces (canonical names for drill-down) */
export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

export function normalizeCountry(name) {
  if (!name || typeof name !== 'string') return 'Unknown';
  const resolved = resolveCountryAlias(name);
  return resolved || 'Unknown';
}

export function getContinent(country) {
  const c = normalizeCountry(country);
  if (c === 'Unknown') return 'Other';
  return COUNTRY_TO_CONTINENT[c] || 'Other';
}

export function getCountryIso(country) {
  const c = normalizeCountry(country);
  return COUNTRY_ISO[c] || c.substring(0, 2).toUpperCase();
}

export function isSouthAfrica(country) {
  return normalizeCountry(country) === 'South Africa';
}

export function normalizeRegion(region) {
  if (!region || typeof region !== 'string') return 'Unknown';
  const resolved = resolveProvinceAlias(region);
  return resolved || 'Unknown';
}

export function normalizeCity(city) {
  if (!city || typeof city !== 'string') return 'Unknown';
  const resolved = resolveCityAlias(city);
  return resolved || 'Unknown';
}

/** Drill levels used by API + package gates */
export const DRILL_LEVELS = ['world', 'continent', 'country', 'region', 'city'];

export function nextDrillLevel(level, country) {
  if (level === 'world') return 'continent';
  if (level === 'continent') return 'country';
  if (level === 'country') {
    return 'region';
  }
  if (level === 'region') return 'city';
  return null;
}
