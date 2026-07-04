// src/services/visitorOriginAdapter.ts

/**
 * Visitor Origin Data Adapter
 * 
 * Transforms FastCheckIn's raw booking records into the aggregated
 * data structure that the VisitorOriginExplorer component expects.
 */

import { 
  Booking, 
  VisitorRecord, 
  ContinentData,
  CountryData,
  RegionData,
  CityData,
  VisitorData,
  SimpleVisitorData
} from '../types';

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
  'Rwanda': 'Africa',
  'Uganda': 'Africa',
  'Ethiopia': 'Africa',
  'Congo': 'Africa',
  'Sudan': 'Africa',
  
  // Europe
  'Germany': 'Europe',
  'France': 'Europe',
  'United Kingdom': 'Europe',
  'UK': 'Europe',
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
  'Russia': 'Europe',
  'Turkey': 'Europe',
  'Czech Republic': 'Europe',
  'Hungary': 'Europe',
  'Romania': 'Europe',
  'Bulgaria': 'Europe',
  'Croatia': 'Europe',
  'Ukraine': 'Europe',
  
  // North America
  'United States': 'North America',
  'USA': 'North America',
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
  'UAE': 'Asia',
  'Saudi Arabia': 'Asia',
  'Israel': 'Asia',
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
// CORE ADAPTER FUNCTIONS
// ============================================================

/**
 * Maps a country name to its continent
 */
export function mapCountryToContinent(country: string): string {
  if (!country) return 'Unknown';
  return COUNTRY_TO_CONTINENT[country] || 'Unknown';
}

/**
 * Transforms Booking records to VisitorRecord format
 * Compatible with VisitorOriginExplorer component
 */
export function transformBookingsToVisitorOrigins(bookings: any[]): VisitorRecord[] {
  if (!bookings || !Array.isArray(bookings)) {
    return [];
  }

  return bookings.map((booking, index) => {
    const country = booking.guest_country || booking.country || 'Unknown';
    const continent = mapCountryToContinent(country);
    const region = booking.guest_province || booking.province || 'Unknown';
    const city = booking.guest_city || booking.city || 'Unknown';

    let checkInMethod: VisitorRecord['checkInMethod'] = 'Reception Desk';
    if (booking.check_in_method === 'QR Code' || booking.checkInMethod === 'QR Code') {
      checkInMethod = 'QR Code';
    } else if (booking.source === 'live_checkin') {
      checkInMethod = 'QR Code';
    } else if (booking.settlementMethod === 'Card' || booking.settlement_method === 'Card') {
      checkInMethod = 'Kiosk';
    } else if (booking.settlementMethod?.includes('EFT') || booking.settlement_method?.includes('EFT')) {
      checkInMethod = 'Direct Link';
    } else if (booking.booking_source === 'Direct Link' || booking.referral_source === 'Direct Link') {
      checkInMethod = 'Direct Link';
    }

    let guestType: VisitorRecord['guestType'] = 'First-time';
    if (booking.guest_type === 'VIP' || booking.guestType === 'VIP') {
      guestType = 'VIP';
    } else if (
      booking.referralSource === 'Word of mouth' || 
      booking.referral_source === 'Word of mouth' ||
      booking.booking_source === 'Booking.com' ||
      booking.referral_source === 'Booking.com'
    ) {
      guestType = 'Returning';
    } else if (booking.guest_type === 'Returning' || booking.guestType === 'Returning') {
      guestType = 'Returning';
    }

    const timestamp = booking.timestamp || booking.created_at || booking.check_in_date || new Date().toISOString();

    return {
      id: booking.id || `booking-${Date.now()}-${index}`,
      timestamp,
      continent,
      country,
      region,
      city,
      checkInMethod,
      guestType,
      _meta: {
        bookingId: booking.id,
        settlementMethod: booking.settlementMethod || booking.settlement_method,
        referralSource: booking.referralSource || booking.referral_source,
        totalAmount: booking.totalAmount || booking.total_amount,
        guests: booking.guests || booking.adults || 1,
      }
    };
  });
}

/**
 * Combined function: Transform raw Supabase bookings to VisitorRecords
 */
export function fetchAndTransformBookings(rawBookings: any[]): VisitorRecord[] {
  if (!rawBookings || !Array.isArray(rawBookings)) {
    return [];
  }

  const bookings = rawBookings.map((raw: any) => ({
    id: raw.id || raw.booking_id,
    guestName: raw.guest_name || raw.guestName || '',
    guest_first_name: raw.guest_first_name || raw.guestFirstName || '',
    guest_last_name: raw.guest_last_name || raw.guestLastName || '',
    email: raw.guest_email || raw.email || '',
    phone: raw.guest_phone || raw.phone || '',
    country: raw.guest_country || raw.country || '',
    city: raw.guest_city || raw.city || '',
    province: raw.guest_province || raw.province || '',
    passportOrId: raw.passport_or_id || raw.passportOrId || raw.guest_id_number || '',
    nextDestination: raw.next_destination || raw.nextDestination || '',
    checkInDate: raw.check_in_date || raw.checkInDate || '',
    checkOutDate: raw.check_out_date || raw.checkOutDate || '',
    nights: raw.nights || 0,
    settlementMethod: raw.settlement_method || raw.settlementMethod || 'Cash',
    referralSource: raw.referral_source || raw.referralSource || 'Google',
    guests: raw.guests || 1,
    adults: raw.adults || 1,
    kids: raw.kids || 0,
    roomType: raw.room_type || raw.roomType || 'Lodge Room',
    totalAmount: raw.total_amount || raw.totalAmount || 0,
    status: raw.status || 'Confirmed',
    year: raw.year || new Date().getFullYear(),
    month: raw.month || new Date().toLocaleString('default', { month: 'short' }),
    popiaMarketingConsent: raw.popia_marketing_consent || raw.popiaMarketingConsent || false,
    timestamp: raw.timestamp || raw.created_at || new Date().toISOString(),
    tenantId: raw.tenant_id || raw.tenantId,
    source: raw.source || 'csv_import',
    season: raw.season || 'Mid',
    guest_type: raw.guest_type || raw.guestType,
    check_in_method: raw.check_in_method || raw.checkInMethod,
    booking_source: raw.booking_source || raw.bookingSource,
  }));

  return transformBookingsToVisitorOrigins(bookings);
}

// ============================================================
// HIERARCHICAL DATA BUILDERS
// ============================================================

/**
 * Builds a complete hierarchical visitor data structure
 */
export function buildVisitorData(bookings: any[]): VisitorData {
  if (!bookings || bookings.length === 0) {
    return {
      world: { total: 0 },
      continents: [],
    };
  }

  const continentCounts: Record<string, number> = {};
  const countryCounts: Record<string, Record<string, number>> = {};
  const regionCounts: Record<string, Record<string, number>> = {};
  const cityCounts: Record<string, Record<string, number>> = {};

  bookings.forEach((booking) => {
    const country = booking.guest_country || booking.country;
    if (!country) return;

    const continent = getContinent(country);

    continentCounts[continent] = (continentCounts[continent] || 0) + 1;

    if (!countryCounts[continent]) {
      countryCounts[continent] = {};
    }
    countryCounts[continent][country] = (countryCounts[continent][country] || 0) + 1;

    const region = booking.guest_province || booking.province || 'Unknown';
    if (!regionCounts[country]) {
      regionCounts[country] = {};
    }
    regionCounts[country][region] = (regionCounts[country][region] || 0) + 1;

    const city = booking.guest_city || booking.city || 'Unknown';
    if (!cityCounts[region]) {
      cityCounts[region] = {};
    }
    cityCounts[region][city] = (cityCounts[region][city] || 0) + 1;
  });

  const total = bookings.length;

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
 * Builds a simple key-value object of continent → visitor count
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
 * Builds visitor data by continent only (no hierarchy)
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
 * Builds country data for a specific continent
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
 * Builds region/province data for a specific country
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
 * Builds city data for a specific region/province
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
 * Get the continent for a given country
 */
export function getContinent(country: string): string {
  if (!country) return 'Other';
  return COUNTRY_TO_CONTINENT[country] || 'Other';
}

/**
 * Get all unique countries from bookings
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
 * Get all unique continents from bookings
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
 * Get the total visitor count for the world
 */
export function getTotalVisitors(bookings: any[]): number {
  return bookings?.length || 0;
}
