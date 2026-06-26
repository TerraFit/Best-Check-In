/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VisitorRecord } from '../types';
import { Booking } from '../types'; // Assuming Booking is exported from types.ts

// Country to Continent Map for robust normalization
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
 * Transforms Best-Check-In Booking records to unified VisitorOrigin records
 * compatible with the VisitorOriginExplorer visualization.
 */
export function transformBookingsToVisitorOrigins(bookings: Booking[]): VisitorRecord[] {
  if (!bookings || !Array.isArray(bookings)) {
    return [];
  }

  return bookings.map((booking) => {
    // 1. Resolve country name (from Booking.country)
    const country = booking.country || 'Unknown';
    
    // 2. Map country to continent automatically
    const continent = mapCountryToContinent(country);

    // 3. Resolve province/state/region (from Booking.province)
    const region = booking.province || 'Unknown';

    // 4. Resolve city/suburb (from Booking.city)
    const city = booking.city || 'Unknown';

    // 5. Determine check-in method based on settlement method or source
    // Map settlement method to check-in method
    let checkInMethod: VisitorRecord['checkInMethod'] = 'Reception Desk';
    if (booking.settlementMethod === 'Instant EFT' || booking.settlementMethod === 'Instant EFT (RSA resident only)') {
      checkInMethod = 'Direct Link';
    } else if (booking.settlementMethod === 'Card') {
      checkInMethod = 'Kiosk';
    } else if (booking.source === 'live_checkin') {
      checkInMethod = 'QR Code';
    }

    // 6. Determine guest type based on booking history
    let guestType: VisitorRecord['guestType'] = 'First-time';
    // If there's a way to check if this guest has booked before, use it
    // For now, we'll use a simple heuristic based on referral source
    if (booking.referralSource === 'Word of mouth' || booking.referralSource === 'Booking.com') {
      guestType = 'Returning';
    }

    // 7. Use timestamp from booking
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
      // Additional metadata for debugging/analytics
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
 * Transforms raw Supabase query results (snake_case) to Booking format
 * Use this if you're fetching directly from Supabase
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
 * Combined function: Fetch raw Supabase bookings and transform to VisitorRecords
 * This is the main function you'll use in ReportsTab
 */
export function fetchAndTransformBookings(rawBookings: any[]): VisitorRecord[] {
  // First transform raw Supabase data to Booking objects
  const bookings = rawBookings.map(transformRawSupabaseBooking);
  // Then transform to VisitorRecords
  return transformBookingsToVisitorOrigins(bookings);
}
