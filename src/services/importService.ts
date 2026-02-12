import { Booking, SettlementMethod, ReferralSource } from '../types';
import { HIGH_SEASON_MONTHS, LOW_SEASON_MONTHS } from '../constants';

export interface ImportPreview {
  newBookings: Booking[];
  duplicateBookings: Booking[];
  stats: {
    total: number;
    new: number;
    duplicates: number;
    skipped: number;
  };
}

export interface NormalizedGuest {
  normalizedName: string;
  country: string;
  passportOrId?: string;
}

// Country name normalization mapping
const COUNTRY_MAP: Record<string, string> = {
  'UK': 'United Kingdom',
  'U.K.': 'United Kingdom',
  'England': 'United Kingdom',
  'Scotland': 'United Kingdom',
  'Wales': 'United Kingdom',
  'Northern Ireland': 'United Kingdom',
  'USA': 'United States of America',
  'U.S.A': 'United States of America',
  'US': 'United States of America',
  'America': 'United States of America',
  'SA': 'South Africa',
  'RSA': 'South Africa',
  'DE': 'Germany',
  'GER': 'Germany',
  'FR': 'France',
  'NL': 'Netherlands',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'BE': 'Belgium',
  'IT': 'Italy',
  'ES': 'Spain',
  'AU': 'Australia',
  'CA': 'Canada',
  'NZ': 'New Zealand'
};

export function normalizeCountry(country: string): string {
  if (!country) return 'South Africa';
  
  const trimmed = country.trim();
  
  // Check if it's in our mapping
  if (COUNTRY_MAP[trimmed]) {
    return COUNTRY_MAP[trimmed];
  }
  
  // Return as-is if not found
  return trimmed;
}

export function normalizeGuestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')     // Normalize spaces
    .trim();
}

export function calculateSeason(date: Date): 'High' | 'Low' | 'Mid' {
  const month = date.getMonth();
  if (HIGH_SEASON_MONTHS.includes(month)) return 'High';
  if (LOW_SEASON_MONTHS.includes(month)) return 'Low';
  return 'Mid';
}

export function findMatchingGuest(
  importedBooking: Partial<Booking>,
  existingBookings: Booking[]
): Booking | undefined {
  // 1. Try to match by ID/Passport (most reliable)
  if (importedBooking.passportOrId) {
    const normalizedId = importedBooking.passportOrId.trim().toUpperCase();
    const match = existingBookings.find(b => 
      b.passportOrId?.trim().toUpperCase() === normalizedId
    );
    if (match) return match;
  }
  
  // 2. Try to match by normalized name + country
  if (importedBooking.guestName && importedBooking.country) {
    const normalizedName = normalizeGuestName(importedBooking.guestName);
    const normalizedCountry = normalizeCountry(importedBooking.country);
    
    return existingBookings.find(b => 
      normalizeGuestName(b.guestName) === normalizedName &&
      normalizeCountry(b.country) === normalizedCountry
    );
  }
  
  return undefined;
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    let day = parts[0].trim();
    let month = parts[1].trim();
    let year = parts[2].trim();
    
    // Handle YY vs YYYY
    if (year.length === 2) year = '20' + year;
    
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try YYYY-MM-DD format
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  return null;
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
}

export function mapRowToBooking(row: any, existingBookings: Booking[]): {
  booking: Booking | null;
  isDuplicate: boolean;
  matchedGuest?: Booking;
} {
  try {
    // Parse dates
    const checkInDate = parseDate(row['DATE OF ARRIVAL'] || row['Date of Arrival'] || row['Check-In']);
    const checkOutDate = parseDate(row['DATE OF DEPARTURE'] || row['Date of Departure'] || row['Check-Out']);
    
    if (!checkInDate) return { booking: null, isDuplicate: false };
    
    // Calculate nights
    let nights = 1;
    if (checkOutDate) {
      nights = calculateNights(checkInDate, checkOutDate);
    }
    
    // Get guest name
    const guestName = row['FULL NAME'] || row['Full Name'] || row['Name'] || '';
    if (!guestName) return { booking: null, isDuplicate: false };
    
    // Normalize country
    const rawCountry = row['COUNTRY OF RESIDENCE'] || row['Country'] || 'South Africa';
    const country = normalizeCountry(rawCountry);
    
    // Create partial booking for matching
    const partialBooking: Partial<Booking> = {
      guestName: guestName.trim(),
      passportOrId: row['ID NUMBER'] || row['Passport'] || row['ID/Passport'] || '',
      country,
      email: row['Adresse e-mail'] || row['Email'] || '',
      phone: row['PHONE NUMBER'] || row['Phone'] || ''
    };
    
    // Check for duplicate
    const matchedGuest = findMatchingGuest(partialBooking, existingBookings);
    
    // Determine season
    const season = calculateSeason(checkInDate);
    
    // Create full booking
    const booking: Booking = {
      id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      guestName: guestName.trim(),
      email: partialBooking.email,
      phone: partialBooking.phone,
      country,
      city: row['CITY - TOWN'] || row['City'] || '',
      province: row['PROVINCE (RSA only)'] || '',
      passportOrId: partialBooking.passportOrId || `IMPORT-${Date.now()}`,
      nextDestination: row['Next Destination'] || 'Unknown',
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate?.toISOString().split('T')[0] || checkInDate.toISOString().split('T')[0],
      nights,
      settlementMethod: (row['Settlement Method'] || 'Card') as SettlementMethod,
      referralSource: (row['Referral Source'] || 'Google') as ReferralSource,
      guests: parseInt(row['Guests'] || '2'),
      adults: parseInt(row['Adults'] || '2'),
      kids: parseInt(row['Children'] || '0'),
      roomType: 'Suite',
      totalAmount: parseFloat(row['Total Amount'] || '0') || (nights * 2500),
      status: 'Completed',
      year: checkInDate.getFullYear(),
      month: checkInDate.toLocaleString('default', { month: 'short' }),
      season, // Add season for analytics
      popiaMarketingConsent: row['Marketing Consent'] === 'Yes',
      timestamp: row['Timestamp'] || new Date().toISOString(),
      source: 'csv_import' // Mark as imported data
    };
    
    return {
      booking,
      isDuplicate: !!matchedGuest,
      matchedGuest
    };
  } catch (error) {
    console.error('Error mapping row:', error);
    return { booking: null, isDuplicate: false };
  }
}

export function mergeMonthlyData(
  existing: MonthlyData[],
  newBookings: Booking[]
): MonthlyData[] {
  const monthlyMap = new Map<string, MonthlyData>();
  
  // Add existing data
  existing.forEach(m => {
    const key = `${m.month}-${m.year}`;
    monthlyMap.set(key, { ...m });
  });
  
  // Merge new bookings
  newBookings.forEach(b => {
    const key = `${b.month}-${b.year}`;
    const existing = monthlyMap.get(key);
    
    if (existing) {
      existing.bookings += 1;
      existing.revenue += b.totalAmount || (b.nights * 2500);
      
      if (!existing.referralData) existing.referralData = {};
      const source = b.referralSource || 'Unknown';
      existing.referralData[source] = (existing.referralData[source] || 0) + 1;
      
      // Update occupancy if we have it
      if (existing.occupancyPercent) {
        // Recalculate average occupancy - simplified
        existing.occupancyPercent = Math.min(100, existing.occupancyPercent + 1);
      }
    } else {
      monthlyMap.set(key, {
        month: b.month,
        year: b.year,
        bookings: 1,
        revenue: b.totalAmount || (b.nights * 2500),
        referralData: { [b.referralSource || 'Unknown']: 1 },
        occupancyPercent: 50 // Default for new months
      });
    }
  });
  
  return Array.from(monthlyMap.values())
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
}
