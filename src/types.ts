/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================
// CORE BOOKING TYPE
// ============================================================

export interface Booking {
  id: string;
  guestName: string;
  email?: string;
  phone?: string;
  country?: string;
  province?: string;
  city?: string;
  passportOrId?: string;
  nextDestination?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights: number;
  settlementMethod?: string;
  referralSource?: string;
  guests: number;
  adults: number;
  kids: number;
  roomType?: string;
  totalAmount: number;
  status?: string;
  year: number;
  month: string;
  popiaMarketingConsent?: boolean;
  timestamp: string;
  tenantId?: string;
  source?: string;
  season?: string;
  signatureData?: string;
  idPhotoData?: string;
  arrivingFrom?: string;
  booking_source?: string;
  [key: string]: any;
}

// ============================================================
// VISITOR ORIGIN TYPES
// ============================================================

export interface VisitorRecord {
  id: string;
  timestamp: string;
  continent: string;
  country: string;
  region: string;
  city: string;
  checkInMethod: 'QR Code' | 'Direct Link' | 'Reception Desk' | 'Kiosk';
  guestType: 'First-time' | 'Returning' | 'VIP';
  _meta?: {
    bookingId?: string;
    settlementMethod?: string;
    referralSource?: string;
    totalAmount?: number;
    guests?: number;
  };
}

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

// ============================================================
// SUBSCRIPTION TYPES
// ============================================================

export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'business';

export interface SubscriptionLimits {
  subscriptionTier: SubscriptionTier;
  canViewCountries: boolean;
  canViewRegions: boolean;
  canViewCities: boolean;
  maxDrillLevel: string;
}

// ============================================================
// DASHBOARD / ANALYTICS TYPES
// ============================================================

export interface MonthlyData {
  month: string;
  year: number;
  bookings: number;
  revenue: number;
  occupancyPercent?: number;
  referralData?: Record<string, number>;
}

export interface SeasonStats {
  season: 'High' | 'Low' | 'Mid';
  bookings: number;
  revenue: number;
  occupancy: number;
}

export type ViewState = 'HOME' | 'CHECKIN' | 'ADMIN_DASHBOARD' | 'REPORTS' | 'IMPORT';

export type SettlementMethod = 'Cash' | 'Card' | 'Instant EFT' | 'Instant EFT (RSA resident only)' | 'Part of a package';

export type ReferralSource = 'Word of mouth' | 'Booking.com' | 'Google' | 'Facebook / Instagram' | 'Travel Agency' | 'LinkedIn' | 'YouTube' | 'Research engine' | 'TikTok';

// ============================================================
// COUNTRY TO CONTINENT MAPPING
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
  
  // Oceania
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
  'Fiji': 'Oceania',
};

/**
 * Maps a country name to its continent
 */
export function mapCountryToContinent(country: string): string {
  const normalizedCountry = country?.trim() || 'Unknown';
  return COUNTRY_TO_CONTINENT[normalizedCountry] || 'Unknown';
}

/**
 * Transforms Booking records to VisitorRecord format
 */
export function transformBookingsToVisitorOrigins(bookings: Booking[]): VisitorRecord[] {
  if (!bookings || !Array.isArray(bookings)) {
    return [];
  }

  return bookings.map((booking) => {
    const country = booking.country || 'Unknown';
    const continent = mapCountryToContinent(country);
    const region = booking.province || 'Unknown';
    const city = booking.city || 'Unknown';

    let checkInMethod: VisitorRecord['checkInMethod'] = 'Reception Desk';
    if (booking.settlementMethod === 'Instant EFT' || booking.settlementMethod === 'Instant EFT (RSA resident only)') {
      checkInMethod = 'Direct Link';
    } else if (booking.settlementMethod === 'Card') {
      checkInMethod = 'Kiosk';
    } else if (booking.source === 'live_checkin') {
      checkInMethod = 'QR Code';
    }

    let guestType: VisitorRecord['guestType'] = 'First-time';
    if (booking.referralSource === 'Word of mouth' || booking.referralSource === 'Booking.com') {
      guestType = 'Returning';
    }

    const timestamp = booking.timestamp || booking.checkInDate || new Date().toISOString();

    return {
      id: booking.id || `booking-${Date.now()}-${Math.random()}`,
      timestamp,
      continent,
      country,
      region,
      city,
      checkInMethod,
      guestType,
      _meta: {
        bookingId: booking.id,
        settlementMethod: booking.settlementMethod,
        referralSource: booking.referralSource,
        totalAmount: booking.totalAmount,
        guests: booking.guests,
      }
    };
  });
}

/**
 * Transforms raw Supabase query results to Booking format
 */
export function transformRawSupabaseBooking(rawBooking: any): Booking {
  return {
    id: rawBooking.id || rawBooking.booking_id,
    guestName: rawBooking.guest_name || rawBooking.guestName || '',
    email: rawBooking.email || '',
    phone: rawBooking.phone || '',
    country: rawBooking.guest_country || rawBooking.country || '',
    city: rawBooking.guest_city || rawBooking.city || '',
    province: rawBooking.guest_province || rawBooking.province || '',
    passportOrId: rawBooking.passport_or_id || rawBooking.passportOrId || '',
    nextDestination: rawBooking.next_destination || rawBooking.nextDestination || '',
    checkInDate: rawBooking.check_in_date || rawBooking.checkInDate || '',
    checkOutDate: rawBooking.check_out_date || rawBooking.checkOutDate || '',
    nights: rawBooking.nights || 0,
    settlementMethod: rawBooking.settlement_method || rawBooking.settlementMethod || 'Cash',
    referralSource: rawBooking.referral_source || rawBooking.referralSource || 'Google',
    guests: rawBooking.guests || 1,
    adults: rawBooking.adults || 1,
    kids: rawBooking.kids || 0,
    roomType: rawBooking.room_type || rawBooking.roomType || 'Lodge Room',
    totalAmount: rawBooking.total_amount || rawBooking.totalAmount || 0,
    status: rawBooking.status || 'Confirmed',
    year: rawBooking.year || new Date().getFullYear(),
    month: rawBooking.month || new Date().toLocaleString('default', { month: 'short' }),
    popiaMarketingConsent: rawBooking.popia_marketing_consent || rawBooking.popiaMarketingConsent || false,
    timestamp: rawBooking.timestamp || rawBooking.created_at || new Date().toISOString(),
    tenantId: rawBooking.tenant_id || rawBooking.tenantId,
    source: rawBooking.source || 'csv_import',
    season: rawBooking.season || 'Mid',
  };
}

/**
 * Combined function: Transform raw Supabase bookings to VisitorRecords
 */
export function fetchAndTransformBookings(rawBookings: any[]): VisitorRecord[] {
  const bookings = rawBookings.map(transformRawSupabaseBooking);
  return transformBookingsToVisitorOrigins(bookings);
}
