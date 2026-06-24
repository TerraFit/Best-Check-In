// src/types/analytics.ts

export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'business';

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
  maxDrillLevel: DrillLevel;
  canViewCountries: boolean;
  canViewRegions: boolean;
  canViewCities: boolean;
  canViewTravelPatterns: boolean;
  canExportData: boolean;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  starter: {
    maxDrillLevel: 'world',
    canViewCountries: false,
    canViewRegions: false,
    canViewCities: false,
    canViewTravelPatterns: false,
    canExportData: false,
  },
  growth: {
    maxDrillLevel: 'continent',
    canViewCountries: true,
    canViewRegions: false,
    canViewCities: false,
    canViewTravelPatterns: false,
    canExportData: true,
  },
  pro: {
    maxDrillLevel: 'country',
    canViewCountries: true,
    canViewRegions: true,
    canViewCities: false,
    canViewTravelPatterns: true,
    canExportData: true,
  },
  business: {
    maxDrillLevel: 'city',
    canViewCountries: true,
    canViewRegions: true,
    canViewCities: true,
    canViewTravelPatterns: true,
    canExportData: true,
  }
};
