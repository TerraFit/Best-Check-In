// src/services/visitorOriginAdapter.ts

/**
 * Visitor Origin Data Adapter
 * 
 * Transforms FastCheckIn's raw booking records into the aggregated
 * data structure that the VisitorOriginExplorer component expects.
 * 
 * The explorer was designed with pre-aggregated data from AI Studio.
 * This adapter bridges the gap between raw records and aggregated data.
 */

// ============================================================
// TYPES
// ============================================================

export interface ContinentData {
  name: string;
  count: number;
  percentage: number;
  children?: CountryData[];
}

export interface CountryData {
  name: string;
  count: number;
  percentage: number;
  children?: RegionData[];
}

export interface RegionData {
  name: string;
  count: number;
  percentage: number;
  children?: CityData[];
}

export interface CityData {
  name: string;
  count: number;
  percentage: number;
}

export interface VisitorData {
  world: {
    total: number;
  };
  continents: ContinentData[];
}

export interface SimpleVisitorData {
  [continent: string]: number;
}

// ============================================================
// COUNTRY → CONTINENT MAPPING
// ============================================================

const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // Africa
  'South Africa': 'Africa',
  'Namibia': 'Africa',
  'Botswana': 'Africa',
  'Zimbabwe': 'Africa',
  'Mozambique': 'Africa',
  'Lesotho': 'Africa',
  'Eswatini': 'Africa',
  'Zambia': 'Africa',
  'Angola': 'Africa',
  'Malawi': 'Africa',
  'Tanzania': 'Africa',
  'Kenya': 'Africa',
  'Nigeria': 'Africa',
  'Ghana': 'Africa',
  'Egypt': 'Africa',
  'Morocco': 'Africa',
  'Tunisia': 'Africa',
  'Algeria': 'Africa',
  'Mauritius': 'Africa',
  'Seychelles': 'Africa',
  'Congo': 'Africa',
  'Ethiopia': 'Africa',
  'Uganda': 'Africa',
  'Rwanda': 'Africa',
  'Sudan': 'Africa',
  // Europe
  'Germany': 'Europe',
  'France': 'Europe',
  'United Kingdom': 'Europe',
  'Italy': 'Europe',
  'Spain': 'Europe',
  'Netherlands': 'Europe',
  'Switzerland': 'Europe',
  'Austria': 'Europe',
  'Belgium': 'Europe',
  'Portugal': 'Europe',
  'Sweden': 'Europe',
  'Norway': 'Europe',
  'Denmark': 'Europe',
  'Finland': 'Europe',
  'Greece': 'Europe',
  'Ireland': 'Europe',
  'Poland': 'Europe',
  'Czech Republic': 'Europe',
  'Hungary': 'Europe',
  'Romania': 'Europe',
  'Bulgaria': 'Europe',
  'Croatia': 'Europe',
  'Russia': 'Europe',
  'Ukraine': 'Europe',
  // North America
  'United States': 'North America',
  'United States of America': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',
  // South America
  'Brazil': 'South America',
  'Argentina': 'South America',
  'Chile': 'South America',
  'Colombia': 'South America',
  'Peru': 'South America',
  'Venezuela': 'South America',
  // Asia
  'China': 'Asia',
  'India': 'Asia',
  'Japan': 'Asia',
  'South Korea': 'Asia',
  'Singapore': 'Asia',
  'Malaysia': 'Asia',
  'Indonesia': 'Asia',
  'Thailand': 'Asia',
  'Vietnam': 'Asia',
  'Philippines': 'Asia',
  'Saudi Arabia': 'Asia',
  'United Arab Emirates': 'Asia',
  'Israel': 'Asia',
  'Turkey': 'Asia',
  'Pakistan': 'Asia',
  'Bangladesh': 'Asia',
  // Oceania
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
  'Fiji': 'Oceania',
  // Other
  'Other': 'Other',
};

// ============================================================
// MAIN ADAPTER FUNCTIONS
// ============================================================

/**
 * Builds a complete hierarchical visitor data structure
 * suitable for the VisitorOriginExplorer component.
 * 
 * @param bookings - Array of raw booking records from Supabase
 * @returns Hierarchical data structure with continents → countries → regions → cities
 * 
 * @example
 * const data = buildVisitorData(bookings);
 * // {
 * //   world: { total: 506 },
 * //   continents: [
 * //     { name: 'Africa', count: 506, percentage: 50.3, children: [...] },
 * //     { name: 'Europe', count: 235, percentage: 23.4, children: [...] },
 * //   ]
 * // }
 */
export function buildVisitorData(bookings: any[]): VisitorData {
  if (!bookings || bookings.length === 0) {
    return {
      world: { total: 0 },
      continents: [],
    };
  }

  // Step 1: Aggregate counts at each level
  const continentCounts: Record<string, number> = {};
  const countryCounts: Record<string, Record<string, number>> = {};
  const regionCounts: Record<string, Record<string, number>> = {};
  const cityCounts: Record<string, Record<string, number>> = {};

  bookings.forEach((booking) => {
    const country = booking.guest_country || booking.country;
    if (!country) return;

    const continent = getContinent(country);

    // Continent aggregation
    continentCounts[continent] = (continentCounts[continent] || 0) + 1;

    // Country aggregation (per continent)
    if (!countryCounts[continent]) {
      countryCounts[continent] = {};
    }
    countryCounts[continent][country] = (countryCounts[continent][country] || 0) + 1;

    // Region/Province aggregation (per country)
    const region = booking.guest_province || booking.province || 'Unknown';
    if (!regionCounts[country]) {
      regionCounts[country] = {};
    }
    regionCounts[country][region] = (regionCounts[country][region] || 0) + 1;

    // City aggregation (per region)
    const city = booking.guest_city || booking.city || 'Unknown';
    if (!cityCounts[region]) {
      cityCounts[region] = {};
    }
    cityCounts[region][city] = (cityCounts[region][city] || 0) + 1;
  });

  const total = bookings.length;

  // Step 2: Build the hierarchical structure
  const continents = Object.entries(continentCounts).map(([continentName, continentCount]) => {
    const countries = Object.entries(countryCounts[continentName] || {}).map(([countryName, countryCount]) => {
      const regions = Object.entries(regionCounts[countryName] || {}).map(([regionName, regionCount]) => {
        const cities = Object.entries(cityCounts[regionName] || {}).map(([cityName, cityCount]) => ({
          name: cityName,
          count: cityCount,
          percentage: (cityCount / regionCount) * 100,
        }));

        return {
          name: regionName,
          count: regionCount,
          percentage: (regionCount / countryCount) * 100,
          children: cities.length > 0 ? cities : undefined,
        };
      });

      return {
        name: countryName,
        count: countryCount,
        percentage: (countryCount / continentCount) * 100,
        children: regions.length > 0 ? regions : undefined,
      };
    });

    return {
      name: continentName,
      count: continentCount,
      percentage: (continentCount / total) * 100,
      children: countries.length > 0 ? countries : undefined,
    };
  });

  return {
    world: { total },
    continents: continents.sort((a, b) => b.count - a.count),
  };
}

/**
 * Builds a simple key-value object of continent → visitor count.
 * This matches the simplest AI Studio data format.
 * 
 * @param bookings - Array of raw booking records from Supabase
 * @returns Object with continent names as keys and visitor counts as values
 * 
 * @example
 * const data = buildSimpleVisitorData(bookings);
 * // { Africa: 506, Europe: 235, Asia: 78 }
 */
export function buildSimpleVisitorData(bookings: any[]): SimpleVisitorData {
  if (!bookings || bookings.length === 0) {
    return {};
  }

  const result: Record<string, number> = {};

  bookings.forEach((booking) => {
    const country = booking.guest_country || booking.country;
    if (country) {
      const continent = getContinent(country);
      result[continent] = (result[continent] || 0) + 1;
    }
  });

  return result;
}

/**
 * Builds visitor data by continent only (no hierarchy).
 * Useful for the World Map view.
 * 
 * @param bookings - Array of raw booking records from Supabase
 * @returns Array of continent data objects
 * 
 * @example
 * const data = buildContinentData(bookings);
 * // [{ name: 'Africa', count: 506, percentage: 50.3 }, ...]
 */
export function buildContinentData(bookings: any[]): ContinentData[] {
  if (!bookings || bookings.length === 0) {
    return [];
  }

  const continentCounts: Record<string, number> = {};

  bookings.forEach((booking) => {
    const country = booking.guest_country || booking.country;
    if (country) {
      const continent = getContinent(country);
      continentCounts[continent] = (continentCounts[continent] || 0) + 1;
    }
  });

  const total = bookings.length;

  return Object.entries(continentCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Builds country data for a specific continent.
 * Useful for the Country Map view.
 * 
 * @param bookings - Array of raw booking records from Supabase
 * @param continentName - The continent to filter by
 * @returns Array of country data objects
 * 
 * @example
 * const data = buildCountryData(bookings, 'Africa');
 * // [{ name: 'South Africa', count: 506, percentage: 100 }, ...]
 */
export function buildCountryData(bookings: any[], continentName: string): CountryData[] {
  if (!bookings || bookings.length === 0 || !continentName) {
    return [];
  }

  const countryCounts: Record<string, number> = {};
  let total = 0;

  bookings.forEach((booking) => {
    const country = booking.guest_country || booking.country;
    if (country && getContinent(country) === continentName) {
      countryCounts[country] = (countryCounts[country] || 0) + 1;
      total++;
    }
  });

  if (total === 0) return [];

  return Object.entries(countryCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Builds region/province data for a specific country.
 * Useful for the Region Map view.
 * 
 * @param bookings - Array of raw booking records from Supabase
 * @param countryName - The country to filter by
 * @returns Array of region data objects
 * 
 * @example
 * const data = buildRegionData(bookings, 'South Africa');
 * // [{ name: 'Western Cape', count: 243, percentage: 48 }, ...]
 */
export function buildRegionData(bookings: any[], countryName: string): RegionData[] {
  if (!bookings || bookings.length === 0 || !countryName) {
    return [];
  }

  const regionCounts: Record<string, number> = {};
  let total = 0;

  bookings.forEach((booking) => {
    const country = booking.guest_country || booking.country;
    if (country === countryName) {
      const region = booking.guest_province || booking.province || 'Unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
      total++;
    }
  });

  if (total === 0) return [];

  return Object.entries(regionCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Builds city data for a specific region/province.
 * Useful for the City Grid view.
 * 
 * @param bookings - Array of raw booking records from Supabase
 * @param regionName - The region to filter by
 * @returns Array of city data objects
 * 
 * @example
 * const data = buildCityData(bookings, 'Western Cape');
 * // [{ name: 'Cape Town', count: 115, percentage: 47.3 }, ...]
 */
export function buildCityData(bookings: any[], regionName: string): CityData[] {
  if (!bookings || bookings.length === 0 || !regionName) {
    return [];
  }

  const cityCounts: Record<string, number> = {};
  let total = 0;

  bookings.forEach((booking) => {
    const region = booking.guest_province || booking.province;
    if (region === regionName) {
      const city = booking.guest_city || booking.city || 'Unknown';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
      total++;
    }
  });

  if (total === 0) return [];

  return Object.entries(cityCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get the continent for a given country.
 * If the country is not found, returns 'Other'.
 * 
 * @param country - Country name
 * @returns Continent name
 */
export function getContinent(country: string): string {
  if (!country) return 'Other';
  return COUNTRY_TO_CONTINENT[country] || 'Other';
}

/**
 * Get all unique countries from bookings.
 * 
 * @param bookings - Array of raw booking records
 * @returns Array of unique country names
 */
export function getUniqueCountries(bookings: any[]): string[] {
  if (!bookings || bookings.length === 0) return [];

  const countries = new Set<string>();
  bookings.forEach((booking) => {
    const country = booking.guest_country || booking.country;
    if (country) {
      countries.add(country);
    }
  });

  return Array.from(countries).sort();
}

/**
 * Get all unique continents from bookings.
 * 
 * @param bookings - Array of raw booking records
 * @returns Array of unique continent names
 */
export function getUniqueContinents(bookings: any[]): string[] {
  if (!bookings || bookings.length === 0) return [];

  const continents = new Set<string>();
  bookings.forEach((booking) => {
    const country = booking.guest_country || booking.country;
    if (country) {
      continents.add(getContinent(country));
    }
  });

  return Array.from(continents).sort();
}

/**
 * Get the total visitor count for the world.
 * 
 * @param bookings - Array of raw booking records
 * @returns Total number of visitors
 */
export function getTotalVisitors(bookings: any[]): number {
  return bookings?.length || 0;
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  buildVisitorData,
  buildSimpleVisitorData,
  buildContinentData,
  buildCountryData,
  buildRegionData,
  buildCityData,
  getContinent,
  getUniqueCountries,
  getUniqueContinents,
  getTotalVisitors,
};
