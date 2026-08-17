/**
 * Rate management public surface (Step 5).
 */

export type { RateProvider } from './RateProvider';
export type {
  GetSeasonsOptions,
  GetRoomRatesOptions,
  GetSpecialsOptions,
  GetProviderMappingsOptions,
} from './RateProvider';

export { ManualFastCheckInProvider } from './ManualFastCheckInProvider';
export { InMemoryRateRepository } from './rateRepository';
export type { RateRepository } from './rateRepository';

export {
  resolveRoomRate,
  resolveRoomRateFromContext,
  classifySpecialPriority,
  applySpecialToBase,
} from './rateResolutionFoundation';
export type { ResolutionContext, SpecialPriority } from './rateResolutionFoundation';

export {
  validateSeason,
  validateRoomRate,
  validateSpecial,
  validateProviderMapping,
  validateNoOverlappingSeasons,
  validateNoDuplicateExternalMappings,
  validateSpecialRoomOwnership,
  assertValidDateRange,
  dateInRange,
  dateRangesOverlap,
  isValidDateString,
} from './rateValidation';

export type {
  Season,
  RoomRate,
  RateSpecial,
  RateProviderMapping,
  ResolvedRate,
  ResolveRoomRateInput,
  RateProviderId,
  SpecialType,
  SpecialAppliesTo,
} from '../../types/rates';

export {
  RateDomainError,
  RateErrorCodes,
} from '../../types/rates';
