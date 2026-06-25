/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'business';

export interface SubscriptionLimits {
  canViewCountries: boolean;
  canViewRegions: boolean;
  canViewCities: boolean;
  maxDrillLevel: string;
  subscriptionTier: SubscriptionTier;
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
}

export interface ContinentData {
  name: string;
  count: number;
  percentage: number;
}

export interface CountryData {
  name: string;
  count: number;
  percentage: number;
  continent: string;
}

export interface RegionData {
  name: string;
  count: number;
  percentage: number;
  country: string;
}

export interface CityData {
  name: string;
  count: number;
  percentage: number;
  region: string;
}
