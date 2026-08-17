/**
 * Authoritative rate resolution for a single stay night.
 * Pure: no database writes. Snapshots / room_revenue are Step 6+.
 *
 * Priority:
 *   1. Specific one-room special
 *   2. Multi-room special (applies_to=rooms with >1 room, including this room)
 *   3. All-room special
 *   4. Seasonal room rate
 *
 * Same-priority conflicts -> RateDomainError CONFLICTING_SPECIALS (never silent pick).
 */

import {
  RateDomainError,
  RateErrorCodes,
  type Season,
  type RoomRate,
  type RateSpecial,
  type ResolvedRate,
  type ResolveRoomRateInput,
} from '../../types/rates';
import {
  isValidDateString,
  dateInRange,
  validateNoOverlappingSeasons,
} from './rateValidation';
import type { RateRepository } from './rateRepository';

export type SpecialPriority = 'specific' | 'multi' | 'all';

export function classifySpecialPriority(special: RateSpecial, roomId: string): SpecialPriority | null {
  if (!special.active) return null;
  if (special.appliesTo === 'all') return 'all';
  if (special.appliesTo === 'rooms') {
    if (!special.roomIds.includes(roomId)) return null;
    if (special.roomIds.length === 1) return 'specific';
    return 'multi';
  }
  return null;
}

const PRIORITY_ORDER: SpecialPriority[] = ['specific', 'multi', 'all'];

export function applySpecialToBase(base: number, special: RateSpecial): number {
  if (special.specialType === 'fixed') {
    return special.value;
  }
  const discounted = base * (1 - special.value / 100);
  return Math.round(discounted * 100) / 100;
}

export interface ResolutionContext {
  seasons: Season[];
  roomRates: RoomRate[];
  specials: RateSpecial[];
}

/**
 * Resolve rate from an in-memory context (used by tests and by provider-backed resolver).
 */
export function resolveRoomRateFromContext(
  input: ResolveRoomRateInput,
  ctx: ResolutionContext
): ResolvedRate {
  const { businessId, roomId, stayDate } = input;

  if (!isValidDateString(stayDate)) {
    throw new RateDomainError(
      RateErrorCodes.INVALID_STAY_DATE,
      `stayDate must be valid YYYY-MM-DD (got ${stayDate})`,
      { stayDate }
    );
  }

  const seasons = ctx.seasons.filter((s) => s.businessId === businessId);
  const roomRates = ctx.roomRates.filter((r) => r.businessId === businessId && r.roomId === roomId);
  const specials = ctx.specials.filter((s) => s.businessId === businessId);

  validateNoOverlappingSeasons(seasons);

  const matchingSeasons = seasons.filter(
    (s) => s.active && dateInRange(stayDate, s.effectiveFrom, s.effectiveTo)
  );
  if (matchingSeasons.length === 0) {
    throw new RateDomainError(
      RateErrorCodes.MISSING_SEASON,
      `No active season covers ${stayDate} for business ${businessId}`,
      { businessId, stayDate }
    );
  }
  if (matchingSeasons.length > 1) {
    throw new RateDomainError(
      RateErrorCodes.OVERLAPPING_SEASONS,
      `Multiple active seasons cover ${stayDate}`,
      { seasons: matchingSeasons.map((s) => s.id) }
    );
  }
  const season = matchingSeasons[0];

  const matchingRates = roomRates.filter(
    (r) => r.active && r.seasonId === season.id
  );
  if (matchingRates.length === 0) {
    throw new RateDomainError(
      RateErrorCodes.MISSING_ROOM_RATE,
      `No active room rate for room ${roomId} in season "${season.name}" (${season.id}) on ${stayDate}`,
      { businessId, roomId, seasonId: season.id, stayDate }
    );
  }
  matchingRates.sort((a, b) => a.id.localeCompare(b.id));
  const roomRate = matchingRates[0];

  const baseRate = roomRate.rateAmount;

  const applicable = specials.filter(
    (s) =>
      s.active &&
      dateInRange(stayDate, s.effectiveFrom, s.effectiveTo) &&
      classifySpecialPriority(s, roomId) !== null
  );

  let chosen: RateSpecial | null = null;
  for (const priority of PRIORITY_ORDER) {
    const atLevel = applicable.filter((s) => classifySpecialPriority(s, roomId) === priority);
    if (atLevel.length === 0) continue;
    if (atLevel.length > 1) {
      throw new RateDomainError(
        RateErrorCodes.CONFLICTING_SPECIALS,
        `Conflicting ${priority} specials on ${stayDate} for room ${roomId}: ${atLevel.map((s) => s.name).join(', ')}`,
        {
          priority,
          specials: atLevel.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.specialType,
            value: s.value,
          })),
          stayDate,
          roomId,
        }
      );
    }
    chosen = atLevel[0];
    break;
  }

  const resolvedRate = chosen ? applySpecialToBase(baseRate, chosen) : baseRate;

  return {
    businessId,
    roomId,
    stayDate,
    resolvedRate,
    currency: roomRate.currency || 'ZAR',
    provider: roomRate.provider,
    season: { id: season.id, name: season.name },
    special: chosen
      ? {
          id: chosen.id,
          name: chosen.name,
          specialType: chosen.specialType,
          value: chosen.value,
        }
      : { id: null, name: null, specialType: null, value: null },
    baseRateAmount: baseRate,
    roomRateId: roomRate.id,
  };
}

/**
 * Load from repository then resolve. Single authoritative path.
 */
export async function resolveRoomRate(
  input: ResolveRoomRateInput,
  repository: RateRepository
): Promise<ResolvedRate> {
  const [seasons, roomRates, specials] = await Promise.all([
    repository.listSeasons(input.businessId),
    repository.listRoomRates(input.businessId),
    repository.listSpecials(input.businessId),
  ]);
  return resolveRoomRateFromContext(input, { seasons, roomRates, specials });
}
