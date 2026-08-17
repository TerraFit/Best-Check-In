/**
 * Client for Analytics Intelligence server APIs.
 * Aggregation happens only on the server — this module fetches and returns JSON.
 */

import { getAuthToken } from '../utils/auth';

export type DrillLevel = 'world' | 'continent' | 'country' | 'region' | 'city';

export interface OriginNode {
  key: string;
  name: string;
  code?: string;
  count: number;
  percentage: number;
  intensity: number;
  hasChildren: boolean;
  continent?: string;
}

export interface CityDashboard {
  visitors: number;
  averageStay: number;
  returningGuestsPercent: number;
  marketingConsentPercent: number;
  averagePartySize: number;
  topReferral: string | null;
  topMonth: string | null;
}

export interface VisitorOriginsResponse {
  success: boolean;
  meta?: {
    businessId: string;
    businessName?: string | null;
    dateFrom: string;
    dateTo: string;
    totalVisitors: number;
    domesticCount: number;
    internationalCount: number;
    plan: string;
    generatedAt: string;
  };
  level?: DrillLevel;
  parent?: Record<string, string | null>;
  nodes?: OriginNode[];
  /** Country-level nodes used exclusively by the GeoJSON map. */
  mapNodes?: OriginNode[];
  skipToCity?: boolean;
  cityDashboard?: CityDashboard | null;
  limits?: AnalyticsPlanLimits;
  upgradeRequired?: boolean;
  requiredPlan?: string;
  error?: string;
}

export interface AnalyticsPlanLimits {
  plan: string;
  planName?: string;
  canInteractiveMap: boolean;
  canViewContinents: boolean;
  canViewCountries: boolean;
  canViewRegions: boolean;
  canViewCities: boolean;
  maxDrillLevel: string | null;
  canSnapshotPdf: boolean;
  canBiReport: boolean;
  canOpsAnalytics: boolean;
  canAiInsights: boolean;
}

export interface AnalyticsSummaryResponse {
  success: boolean;
  meta?: {
    businessId: string;
    businessName?: string | null;
    logoUrl?: string | null;
    dateFrom: string;
    dateTo: string;
    plan: string;
    totalRooms?: number;
    generatedAt: string;
  };
  summary?: {
    totalBookings: number;
    totalGuests: number;
    totalNights: number;
    totalRevenue: number;
    averageStay: number;
    averagePartySize: number;
    uniqueCountries: number;
    domesticCount: number;
    internationalCount: number;
    domesticPercentage: number;
    internationalPercentage: number;
    consentRate: number;
    returningRate: number;
    topReferral: string | null;
    topMonth: string | null;
    occupancy: {
      roomNightsSold: number;
      sellableRoomNights: number;
      sellableRooms: number;
      daysInPeriod: number;
      occupancyRate: number;
    };
  };
  originContinents?: OriginNode[];
  originCountries?: OriginNode[];
  referralData?: Array<{ name: string; count: number; percentage: number }>;
  monthlyTrend?: Array<{ key: string; label: string; count: number }>;
  arrivingFrom?: Array<{ location: string; count: number; percentage: number }>;
  goingTo?: Array<{ location: string; count: number; percentage: number }>;
  lengthOfStay?: Array<{ bucket: string; count: number; percentage: number }>;
  limits?: AnalyticsPlanLimits;
  error?: string;
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function qs(params: Record<string, string | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchVisitorOrigins(options: {
  businessId: string;
  level?: DrillLevel;
  dateFrom?: string;
  dateTo?: string;
  continent?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
}): Promise<VisitorOriginsResponse> {
  const query = qs({
    businessId: options.businessId,
    level: options.level || 'world',
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
    continent: options.continent,
    country: options.country,
    region: options.region,
    city: options.city,
  });
  const res = await fetch(`/.netlify/functions/get-visitor-origins${query}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function fetchAnalyticsSummary(options: {
  businessId: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AnalyticsSummaryResponse> {
  const query = qs({
    businessId: options.businessId,
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
  });
  const res = await fetch(`/.netlify/functions/get-analytics-summary${query}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function downloadAnalyticsSnapshot(options: {
  businessId: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Blob> {
  const query = qs({
    businessId: options.businessId,
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
  });
  const res = await fetch(`/.netlify/functions/generate-analytics-snapshot${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Snapshot failed (${res.status})`);
  }
  return res.blob();
}

export async function downloadBiReport(options: {
  businessId: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Blob> {
  const query = qs({
    businessId: options.businessId,
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
  });
  const res = await fetch(`/.netlify/functions/generate-bi-report${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `BI report failed (${res.status})`);
  }
  return res.blob();
}

/** Default 90-day window ending today (UTC date string). */
export function defaultAnalyticsRange(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const dateTo = to.toISOString().split('T')[0];
  const from = new Date(to);
  from.setDate(from.getDate() - 89);
  return { dateFrom: from.toISOString().split('T')[0], dateTo };
}
