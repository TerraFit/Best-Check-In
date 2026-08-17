/**
 * Injectable rate data repository.
 * Domain / resolution layers depend on this interface, not on Supabase.
 * ManualFastCheckInProvider and tests use concrete implementations.
 */

import type {
  Season,
  RoomRate,
  RateSpecial,
  RateProviderMapping,
} from '../../types/rates';

export interface RateRepository {
  listSeasons(businessId: string): Promise<Season[]>;
  listRoomRates(businessId: string): Promise<RoomRate[]>;
  listSpecials(businessId: string): Promise<RateSpecial[]>;
  listProviderMappings(businessId: string): Promise<RateProviderMapping[]>;
}

/**
 * In-memory fixture repository for unit tests and local resolution.
 * No network, no credentials.
 */
export class InMemoryRateRepository implements RateRepository {
  constructor(
    private readonly data: {
      seasons?: Season[];
      roomRates?: RoomRate[];
      specials?: RateSpecial[];
      mappings?: RateProviderMapping[];
    } = {}
  ) {}

  async listSeasons(businessId: string): Promise<Season[]> {
    return (this.data.seasons || []).filter((s) => s.businessId === businessId);
  }

  async listRoomRates(businessId: string): Promise<RoomRate[]> {
    return (this.data.roomRates || []).filter((r) => r.businessId === businessId);
  }

  async listSpecials(businessId: string): Promise<RateSpecial[]> {
    return (this.data.specials || []).filter((s) => s.businessId === businessId);
  }

  async listProviderMappings(businessId: string): Promise<RateProviderMapping[]> {
    return (this.data.mappings || []).filter((m) => m.businessId === businessId);
  }
}
