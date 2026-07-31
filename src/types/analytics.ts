// src/types/analytics.ts
// Programme 1: limits derived via featureAccessService.getAnalyticsLimits — do not duplicate prices here.

export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'business' | 'enterprise';

export type DrillLevel = 'world' | 'continent' | 'country' | 'region' | 'city';

export interface AnalyticsFilters {
  dateRange: string;
  startDate: string;
  endDate: string;
  country?: string;
  continent?: string;
  region?: string;
}

export interface OriginData {
  name: string;
  code: string;
  count: number;
  percentage: number;
  coordinates?: { lat: number; lng: number };
  children?: OriginData[];
}

export interface TravelPattern {
  location: string;
  country: string;
  count: number;
  percentage: number;
  isCorrection?: boolean;
  originalInput?: string;
}

export interface AnalyticsData {
  summary: {
    totalBookings: number;
    totalGuests: number;
    occupancyRate: number;
    averageStay: number;
    totalRevenue: number;
    uniqueCountries: number;
    topDestination: string;
  };
  originData: OriginData[];
  referralData: { name: string; count: number; percentage: number }[];
  arrivingFrom: TravelPattern[];
  goingTo: TravelPattern[];
  drillLevel: DrillLevel;
  currentPath: string[];
}

export interface SubscriptionLimits {
  maxDrillLevel: DrillLevel | string;
  canViewCountries: boolean;
  canViewRegions: boolean;
  canViewCities: boolean;
  canViewTravelPatterns?: boolean;
  canExportData?: boolean;
  subscriptionTier?: SubscriptionTier;
}

/** @deprecated Use getAnalyticsLimits from featureAccessService */
export const SUBSCRIPTION_LIMITS: Record<string, SubscriptionLimits> = {};
