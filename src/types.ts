/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  [key: string]: any;
}

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

export interface VisitorData {
  world: { total: number };
  continents: ContinentData[];
}

export interface SimpleVisitorData {
  [continent: string]: number;
}

/** @deprecated Prefer PlanType from src/config/packages */
export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'business' | 'enterprise';

export interface SubscriptionLimits {
  subscriptionTier: SubscriptionTier;
  canViewCountries: boolean;
  canViewRegions: boolean;
  canViewCities: boolean;
  maxDrillLevel: string;
}

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

export type SettlementMethod =
  | 'Cash'
  | 'Card'
  | 'Instant EFT'
  | 'Instant EFT (RSA resident only)'
  | 'Part of a package';

export type ReferralSource =
  | 'Word of mouth'
  | 'Booking.com'
  | 'Google'
  | 'Facebook / Instagram'
  | 'Travel Agency'
  | 'LinkedIn'
  | 'YouTube'
  | 'Research engine'
  | 'TikTok';

export type DrillLevel = 'world' | 'continents' | 'countries' | 'regions' | 'cities';

export type CountryToContinentMap = Record<string, string>;
