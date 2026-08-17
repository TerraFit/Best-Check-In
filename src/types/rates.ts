/**
 * Rate Management — provider-agnostic domain types
 * Step 5 foundation. Maps to migration 013 tables without leaking PostgREST details.
 */

export type RateProviderId = 'manual' | 'nightbridge' | string;

export type SpecialType = 'fixed' | 'percentage';
export type SpecialAppliesTo = 'all' | 'rooms';

export interface Season {
  id: string;
  businessId: string;
  name: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string;   // YYYY-MM-DD
  sortOrder: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomRate {
  id: string;
  businessId: string;
  roomId: string;
  seasonId: string | null;
  rateAmount: number;
  currency: string;
  provider: RateProviderId;
  externalProviderId: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RateSpecial {
  id: string;
  businessId: string;
  name: string;
  specialType: SpecialType;
  value: number;
  appliesTo: SpecialAppliesTo;
  roomIds: string[];
  effectiveFrom: string;
  effectiveTo: string;
  active: boolean;
  provider: RateProviderId;
  externalProviderId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RateProviderMapping {
  id: string;
  businessId: string;
  provider: RateProviderId;
  internalRoomId: string;
  externalRoomId: string;
  externalRoomName: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Result of authoritative rate resolution for a single stay night. */
export interface ResolvedRate {
  businessId: string;
  roomId: string;
  stayDate: string;
  resolvedRate: number;
  currency: string;
  provider: RateProviderId;
  season: {
    id: string | null;
    name: string | null;
  };
  special: {
    id: string | null;
    name: string | null;
    specialType: SpecialType | null;
    value: number | null;
  };
  baseRateAmount: number;
  roomRateId: string | null;
}

export interface ResolveRoomRateInput {
  businessId: string;
  roomId: string;
  stayDate: string; // YYYY-MM-DD
}

/** Explicit domain errors — actionable, never generic "something went wrong". */
export class RateDomainError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'RateDomainError';
    this.code = code;
    this.details = details;
  }
}

export const RateErrorCodes = {
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  OVERLAPPING_SEASONS: 'OVERLAPPING_SEASONS',
  MISSING_SEASON: 'MISSING_SEASON',
  MISSING_ROOM_RATE: 'MISSING_ROOM_RATE',
  INACTIVE_RATE: 'INACTIVE_RATE',
  INACTIVE_SEASON: 'INACTIVE_SEASON',
  INVALID_RATE_AMOUNT: 'INVALID_RATE_AMOUNT',
  INVALID_SPECIAL: 'INVALID_SPECIAL',
  CONFLICTING_SPECIALS: 'CONFLICTING_SPECIALS',
  CROSS_BUSINESS: 'CROSS_BUSINESS',
  INVALID_PERCENTAGE: 'INVALID_PERCENTAGE',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  DUPLICATE_PROVIDER_MAPPING: 'DUPLICATE_PROVIDER_MAPPING',
  MISSING_PROVIDER_MAPPING: 'MISSING_PROVIDER_MAPPING',
  INVALID_STAY_DATE: 'INVALID_STAY_DATE',
} as const;

export type RateErrorCode = (typeof RateErrorCodes)[keyof typeof RateErrorCodes];
