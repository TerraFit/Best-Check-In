/**
 * Rate validation - pure domain rules.
 * No I/O. Used by Manual provider, resolution foundation, and future write APIs.
 */

import {
  RateDomainError,
  RateErrorCodes,
  type Season,
  type RoomRate,
  type RateSpecial,
  type RateProviderMapping,
} from '../../types/rates';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function assertValidDateRange(from: string, to: string, context: string): void {
  if (!isValidDateString(from) || !isValidDateString(to)) {
    throw new RateDomainError(
      RateErrorCodes.INVALID_DATE_RANGE,
      `${context}: dates must be valid YYYY-MM-DD`,
      { from, to }
    );
  }
  if (from > to) {
    throw new RateDomainError(
      RateErrorCodes.INVALID_DATE_RANGE,
      `${context}: effectiveFrom (${from}) must be <= effectiveTo (${to})`,
      { from, to }
    );
  }
}

/** True if [aFrom,aTo] overlaps [bFrom,bTo] (inclusive). */
export function dateRangesOverlap(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string
): boolean {
  return aFrom <= bTo && bFrom <= aTo;
}

/**
 * Reject overlapping *active* seasons for the same business.
 * Same season name in non-overlapping periods is allowed.
 */
export function validateNoOverlappingSeasons(seasons: Season[]): void {
  const active = seasons.filter((s) => s.active);
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.businessId !== b.businessId) continue;
      if (dateRangesOverlap(a.effectiveFrom, a.effectiveTo, b.effectiveFrom, b.effectiveTo)) {
        throw new RateDomainError(
          RateErrorCodes.OVERLAPPING_SEASONS,
          `Overlapping active seasons for business ${a.businessId}: "${a.name}" (${a.effectiveFrom}-${a.effectiveTo}) and "${b.name}" (${b.effectiveFrom}-${b.effectiveTo})`,
          {
            seasonA: { id: a.id, name: a.name, from: a.effectiveFrom, to: a.effectiveTo },
            seasonB: { id: b.id, name: b.name, from: b.effectiveFrom, to: b.effectiveTo },
          }
        );
      }
    }
  }
}

export function validateSeason(season: Season): void {
  assertValidDateRange(season.effectiveFrom, season.effectiveTo, `Season "${season.name}"`);
  if (!season.businessId) {
    throw new RateDomainError(RateErrorCodes.CROSS_BUSINESS, 'Season requires businessId');
  }
  if (!season.name?.trim()) {
    throw new RateDomainError(RateErrorCodes.INVALID_DATE_RANGE, 'Season name is required');
  }
}

export function validateRoomRate(rate: RoomRate): void {
  if (rate.rateAmount < 0) {
    throw new RateDomainError(
      RateErrorCodes.INVALID_RATE_AMOUNT,
      `Room rate amount must be >= 0 (got ${rate.rateAmount})`,
      { rateId: rate.id, rateAmount: rate.rateAmount }
    );
  }
  if (!rate.businessId || !rate.roomId) {
    throw new RateDomainError(
      RateErrorCodes.CROSS_BUSINESS,
      'Room rate requires businessId and roomId'
    );
  }
}

export function validateSpecial(special: RateSpecial): void {
  assertValidDateRange(
    special.effectiveFrom,
    special.effectiveTo,
    `Special "${special.name}"`
  );
  if (special.specialType === 'percentage') {
    if (special.value < 0 || special.value > 100) {
      throw new RateDomainError(
        RateErrorCodes.INVALID_PERCENTAGE,
        `Percentage special must be 0-100 (got ${special.value})`,
        { specialId: special.id, value: special.value }
      );
    }
  } else if (special.specialType === 'fixed') {
    if (special.value < 0) {
      throw new RateDomainError(
        RateErrorCodes.INVALID_SPECIAL,
        `Fixed special value must be >= 0 (got ${special.value})`,
        { specialId: special.id, value: special.value }
      );
    }
  } else {
    throw new RateDomainError(
      RateErrorCodes.INVALID_SPECIAL,
      `Unknown specialType: ${String(special.specialType)}`
    );
  }
  if (special.appliesTo !== 'all' && special.appliesTo !== 'rooms') {
    throw new RateDomainError(
      RateErrorCodes.INVALID_SPECIAL,
      `appliesTo must be 'all' or 'rooms' (got ${String(special.appliesTo)})`
    );
  }
  if (special.appliesTo === 'rooms' && (!special.roomIds || special.roomIds.length === 0)) {
    throw new RateDomainError(
      RateErrorCodes.INVALID_SPECIAL,
      `Special "${special.name}" applies_to=rooms requires at least one roomId`
    );
  }
}

/**
 * Ensure all roomIds on a special belong to the same business.
 * roomBusinessIds: map roomId -> businessId
 */
export function validateSpecialRoomOwnership(
  special: RateSpecial,
  roomBusinessIds: Map<string, string>
): void {
  if (special.appliesTo !== 'rooms') return;
  for (const roomId of special.roomIds) {
    const owner = roomBusinessIds.get(roomId);
    if (!owner) {
      throw new RateDomainError(
        RateErrorCodes.ROOM_NOT_FOUND,
        `Special "${special.name}" references unknown room ${roomId}`,
        { specialId: special.id, roomId }
      );
    }
    if (owner !== special.businessId) {
      throw new RateDomainError(
        RateErrorCodes.CROSS_BUSINESS,
        `Special "${special.name}" contains cross-business room ${roomId}`,
        { specialId: special.id, roomId, roomBusinessId: owner, specialBusinessId: special.businessId }
      );
    }
  }
}

export function validateProviderMapping(mapping: RateProviderMapping): void {
  if (!mapping.businessId || !mapping.internalRoomId || !mapping.externalRoomId) {
    throw new RateDomainError(
      RateErrorCodes.MISSING_PROVIDER_MAPPING,
      'Provider mapping requires businessId, internalRoomId, and externalRoomId'
    );
  }
}

/**
 * Detect duplicate active external mappings for the same provider.
 */
export function validateNoDuplicateExternalMappings(mappings: RateProviderMapping[]): void {
  const seen = new Map<string, RateProviderMapping>();
  for (const m of mappings) {
    if (!m.active) continue;
    const key = `${m.businessId}|${m.provider}|${m.externalRoomId}`;
    const prev = seen.get(key);
    if (prev && prev.internalRoomId !== m.internalRoomId) {
      throw new RateDomainError(
        RateErrorCodes.DUPLICATE_PROVIDER_MAPPING,
        `Duplicate external room mapping for provider ${m.provider}: ${m.externalRoomId}`,
        { mappingA: prev.id, mappingB: m.id, externalRoomId: m.externalRoomId }
      );
    }
    seen.set(key, m);
  }
}

export function dateInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}
