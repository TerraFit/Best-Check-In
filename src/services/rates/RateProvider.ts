/**
 * RateProvider — provider-agnostic contract.
 * ManualFastCheckInProvider implements this today.
 * Future NightBridgeRateProvider implements the same contract.
 * Resolution engine depends only on this interface + domain types.
 */

import type {
  Season,
  RoomRate,
  RateSpecial,
  RateProviderMapping,
  RateProviderId,
} from '../../types/rates';

export interface GetSeasonsOptions {
  businessId: string;
  activeOnly?: boolean;
  /** Optional date filter: seasons that cover this date */
  forDate?: string;
}

export interface GetRoomRatesOptions {
  businessId: string;
  roomId?: string;
  seasonId?: string;
  activeOnly?: boolean;
  provider?: RateProviderId;
}

export interface GetSpecialsOptions {
  businessId: string;
  roomId?: string;
  forDate?: string;
  activeOnly?: boolean;
}

export interface GetProviderMappingsOptions {
  businessId: string;
  provider?: RateProviderId;
  internalRoomId?: string;
  activeOnly?: boolean;
}

/**
 * Provider-neutral rate data access.
 * Implementations must enforce business isolation.
 */
export interface RateProvider {
  readonly providerId: RateProviderId;

  getSeasons(options: GetSeasonsOptions): Promise<Season[]>;

  getRoomRates(options: GetRoomRatesOptions): Promise<RoomRate[]>;

  getSpecials(options: GetSpecialsOptions): Promise<RateSpecial[]>;

  getProviderMappings(options: GetProviderMappingsOptions): Promise<RateProviderMapping[]>;
}
