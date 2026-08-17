/**
 * ManualFastCheckInProvider — concrete RateProvider for FastCheckIn-managed rates.
 * Reads exclusively through an injected RateRepository (no embedded PostgREST).
 * Future NightBridgeRateProvider will implement the same RateProvider contract.
 */

import type {
  Season,
  RoomRate,
  RateSpecial,
  RateProviderMapping,
} from '../../types/rates';
import type {
  RateProvider,
  GetSeasonsOptions,
  GetRoomRatesOptions,
  GetSpecialsOptions,
  GetProviderMappingsOptions,
} from './RateProvider';
import type { RateRepository } from './rateRepository';
import {
  validateSeason,
  validateRoomRate,
  validateSpecial,
  validateProviderMapping,
  validateNoOverlappingSeasons,
  validateNoDuplicateExternalMappings,
  dateInRange,
} from './rateValidation';

export class ManualFastCheckInProvider implements RateProvider {
  readonly providerId = 'manual' as const;

  constructor(private readonly repository: RateRepository) {}

  async getSeasons(options: GetSeasonsOptions): Promise<Season[]> {
    let seasons = await this.repository.listSeasons(options.businessId);
    seasons.forEach(validateSeason);
    validateNoOverlappingSeasons(seasons.filter((s) => s.active));

    if (options.activeOnly !== false) {
      seasons = seasons.filter((s) => s.active);
    }
    if (options.forDate) {
      seasons = seasons.filter((s) => dateInRange(options.forDate!, s.effectiveFrom, s.effectiveTo));
    }
    return seasons;
  }

  async getRoomRates(options: GetRoomRatesOptions): Promise<RoomRate[]> {
    let rates = await this.repository.listRoomRates(options.businessId);
    rates.forEach(validateRoomRate);

    if (options.roomId) {
      rates = rates.filter((r) => r.roomId === options.roomId);
    }
    if (options.seasonId) {
      rates = rates.filter((r) => r.seasonId === options.seasonId);
    }
    if (options.provider) {
      rates = rates.filter((r) => r.provider === options.provider);
    } else {
      rates = rates.filter((r) => r.provider === this.providerId);
    }
    if (options.activeOnly !== false) {
      rates = rates.filter((r) => r.active);
    }
    return rates;
  }

  async getSpecials(options: GetSpecialsOptions): Promise<RateSpecial[]> {
    let specials = await this.repository.listSpecials(options.businessId);
    specials.forEach(validateSpecial);

    if (options.activeOnly !== false) {
      specials = specials.filter((s) => s.active);
    }
    if (options.forDate) {
      specials = specials.filter((s) =>
        dateInRange(options.forDate!, s.effectiveFrom, s.effectiveTo)
      );
    }
    if (options.roomId) {
      specials = specials.filter(
        (s) =>
          s.appliesTo === 'all' ||
          (s.appliesTo === 'rooms' && s.roomIds.includes(options.roomId!))
      );
    }
    return specials;
  }

  async getProviderMappings(options: GetProviderMappingsOptions): Promise<RateProviderMapping[]> {
    let mappings = await this.repository.listProviderMappings(options.businessId);
    mappings.forEach(validateProviderMapping);
    validateNoDuplicateExternalMappings(mappings);

    if (options.provider) {
      mappings = mappings.filter((m) => m.provider === options.provider);
    }
    if (options.internalRoomId) {
      mappings = mappings.filter((m) => m.internalRoomId === options.internalRoomId);
    }
    if (options.activeOnly !== false) {
      mappings = mappings.filter((m) => m.active);
    }
    return mappings;
  }
}
