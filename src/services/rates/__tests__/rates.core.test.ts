/**
 * Rate management core unit tests (Vitest). No network, no credentials.
 */
import { describe, it, expect } from 'vitest';
import {
  RateDomainError,
  RateErrorCodes,
  type Season,
  type RoomRate,
  type RateSpecial,
  type RateProviderMapping,
} from '../../../types/rates';
import { InMemoryRateRepository } from '../rateRepository';
import { ManualFastCheckInProvider } from '../ManualFastCheckInProvider';
import {
  resolveRoomRate,
  resolveRoomRateFromContext,
  applySpecialToBase,
  classifySpecialPriority,
} from '../rateResolutionFoundation';
import {
  validateSeason,
  validateRoomRate,
  validateSpecial,
  validateNoOverlappingSeasons,
  validateNoDuplicateExternalMappings,
  validateSpecialRoomOwnership,
  assertValidDateRange,
} from '../rateValidation';

const BIZ = 'biz-001';
const BIZ2 = 'biz-999';
const RA = 'room-a';
const RB = 'room-b';

const s = (p: Partial<Season> & Pick<Season, 'id' | 'name' | 'effectiveFrom' | 'effectiveTo'>): Season => ({
  businessId: BIZ, sortOrder: 0, active: true, ...p,
});
const r = (p: Partial<RoomRate> & Pick<RoomRate, 'id' | 'roomId' | 'seasonId' | 'rateAmount'>): RoomRate => ({
  businessId: BIZ, currency: 'ZAR', provider: 'manual', externalProviderId: null, active: true, ...p,
});
const sp = (p: Partial<RateSpecial> & Pick<RateSpecial, 'id' | 'name' | 'specialType' | 'value' | 'appliesTo'>): RateSpecial => ({
  businessId: BIZ, roomIds: [], effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31',
  active: true, provider: 'manual', externalProviderId: null, ...p,
});

const low = s({ id: 's-low', name: 'Low', effectiveFrom: '2026-01-01', effectiveTo: '2026-03-31' });
const mid = s({ id: 's-mid', name: 'Mid', effectiveFrom: '2026-04-01', effectiveTo: '2026-06-30' });
const high = s({ id: 's-high', name: 'High', effectiveFrom: '2026-07-01', effectiveTo: '2026-10-31' });
const low2 = s({ id: 's-low2', name: 'Low', effectiveFrom: '2026-11-01', effectiveTo: '2026-12-15' });
const rateLow = r({ id: 'r1', roomId: RA, seasonId: low.id, rateAmount: 2500 });
const rateMid = r({ id: 'r2', roomId: RA, seasonId: mid.id, rateAmount: 3000 });
const rateHigh = r({ id: 'r3', roomId: RA, seasonId: high.id, rateAmount: 4100 });
const rateLow2 = r({ id: 'r4', roomId: RA, seasonId: low2.id, rateAmount: 2600 });

describe('validation', () => {
  it('rejects invalid date range', () => {
    expect(() => assertValidDateRange('2026-06-01', '2026-01-01', 't')).toThrow(RateDomainError);
  });
  it('accepts Low/Mid/High without overlap', () => {
    expect(() => validateNoOverlappingSeasons([low, mid, high])).not.toThrow();
  });
  it('allows Mid absent', () => {
    expect(() => validateNoOverlappingSeasons([low, high])).not.toThrow();
  });
  it('allows same name in multiple periods', () => {
    expect(() => validateNoOverlappingSeasons([low, mid, high, low2])).not.toThrow();
  });
  it('rejects overlapping active seasons', () => {
    const bad = s({ id: 'bad', name: 'X', effectiveFrom: '2026-03-15', effectiveTo: '2026-04-15' });
    expect(() => validateNoOverlappingSeasons([low, mid, bad])).toThrow(
      expect.objectContaining({ code: RateErrorCodes.OVERLAPPING_SEASONS })
    );
  });
  it('rejects negative rate', () => {
    expect(() => validateRoomRate(r({ id: 'x', roomId: RA, seasonId: low.id, rateAmount: -1 }))).toThrow(
      expect.objectContaining({ code: RateErrorCodes.INVALID_RATE_AMOUNT })
    );
  });
  it('rejects percentage > 100', () => {
    expect(() => validateSpecial(sp({ id: 'p', name: 'p', specialType: 'percentage', value: 150, appliesTo: 'all' }))).toThrow(
      expect.objectContaining({ code: RateErrorCodes.INVALID_PERCENTAGE })
    );
  });
  it('rejects cross-business room on special', () => {
    const map = new Map([[RA, BIZ], [RB, BIZ2]]);
    const special = sp({ id: 'c', name: 'c', specialType: 'fixed', value: 1, appliesTo: 'rooms', roomIds: [RB] });
    expect(() => validateSpecialRoomOwnership(special, map)).toThrow(
      expect.objectContaining({ code: RateErrorCodes.CROSS_BUSINESS })
    );
  });
  it('detects duplicate external mappings', () => {
    const m1: RateProviderMapping = {
      id: 'm1', businessId: BIZ, provider: 'nightbridge', internalRoomId: RA,
      externalRoomId: 'NB-1', externalRoomName: null, active: true,
    };
    const m2 = { ...m1, id: 'm2', internalRoomId: RB };
    expect(() => validateNoDuplicateExternalMappings([m1, m2])).toThrow(
      expect.objectContaining({ code: RateErrorCodes.DUPLICATE_PROVIDER_MAPPING })
    );
  });
  it('accepts custom season name', () => {
    expect(() => validateSeason(s({ id: 'pk', name: 'Festive Peak', effectiveFrom: '2026-12-20', effectiveTo: '2026-12-31' }))).not.toThrow();
  });
});

describe('resolution seasons and rates', () => {
  const seasons = [low, mid, high, low2];
  const roomRates = [rateLow, rateMid, rateHigh, rateLow2];

  it('resolves Low', () => {
    const out = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-02-15' }, { seasons, roomRates, specials: [] });
    expect(out.resolvedRate).toBe(2500);
    expect(out.season.name).toBe('Low');
    expect(out.provider).toBe('manual');
  });
  it('resolves Mid', () => {
    const out = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-05-01' }, { seasons, roomRates, specials: [] });
    expect(out.resolvedRate).toBe(3000);
  });
  it('resolves High', () => {
    const out = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-08-01' }, { seasons, roomRates, specials: [] });
    expect(out.resolvedRate).toBe(4100);
  });
  it('works with Mid disabled', () => {
    const out = resolveRoomRateFromContext(
      { businessId: BIZ, roomId: RA, stayDate: '2026-02-01' },
      { seasons: [low, high], roomRates: [rateLow, rateHigh], specials: [] }
    );
    expect(out.resolvedRate).toBe(2500);
  });
  it('second Low period same name', () => {
    const out = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-11-10' }, { seasons, roomRates, specials: [] });
    expect(out.season.id).toBe(low2.id);
    expect(out.resolvedRate).toBe(2600);
  });
  it('boundary dates inclusive', () => {
    expect(resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-04-01' }, { seasons, roomRates, specials: [] }).season.name).toBe('Mid');
    expect(resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-03-31' }, { seasons, roomRates, specials: [] }).season.name).toBe('Low');
  });
  it('no matching season is error not R0', () => {
    expect(() => resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2025-06-01' }, { seasons, roomRates, specials: [] }))
      .toThrow(expect.objectContaining({ code: RateErrorCodes.MISSING_SEASON }));
  });
  it('no matching room rate is error', () => {
    expect(() => resolveRoomRateFromContext({ businessId: BIZ, roomId: RB, stayDate: '2026-02-01' }, { seasons, roomRates, specials: [] }))
      .toThrow(expect.objectContaining({ code: RateErrorCodes.MISSING_ROOM_RATE }));
  });
  it('inactive season ignored', () => {
    expect(() => resolveRoomRateFromContext(
      { businessId: BIZ, roomId: RA, stayDate: '2026-05-01' },
      { seasons: [low, { ...mid, active: false }, high], roomRates, specials: [] }
    )).toThrow(expect.objectContaining({ code: RateErrorCodes.MISSING_SEASON }));
  });
  it('inactive rate ignored', () => {
    expect(() => resolveRoomRateFromContext(
      { businessId: BIZ, roomId: RA, stayDate: '2026-02-01' },
      { seasons: [low], roomRates: [{ ...rateLow, active: false }], specials: [] }
    )).toThrow(expect.objectContaining({ code: RateErrorCodes.MISSING_ROOM_RATE }));
  });
  it('multi-year rates independent', () => {
    const low27 = s({ id: 's27', name: 'Low', effectiveFrom: '2027-01-01', effectiveTo: '2027-03-31' });
    const r27 = r({ id: 'r27', roomId: RA, seasonId: low27.id, rateAmount: 3050 });
    const a = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-02-01' }, { seasons: [low, low27], roomRates: [rateLow, r27], specials: [] });
    const b = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2027-02-01' }, { seasons: [low, low27], roomRates: [rateLow, r27], specials: [] });
    expect(a.resolvedRate).toBe(2500);
    expect(b.resolvedRate).toBe(3050);
  });
});

describe('special priority', () => {
  const seasons = [low];
  const roomRates = [rateLow];

  it('all-room fixed special', () => {
    const special = sp({ id: 'a', name: 'All', specialType: 'fixed', value: 1650, appliesTo: 'all' });
    const out = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-02-01' }, { seasons, roomRates, specials: [special] });
    expect(out.resolvedRate).toBe(1650);
  });
  it('percentage special', () => {
    expect(applySpecialToBase(2500, sp({ id: 'p', name: 'p', specialType: 'percentage', value: 20, appliesTo: 'all' }))).toBe(2000);
  });
  it('specific beats all', () => {
    const all = sp({ id: 'all', name: 'All', specialType: 'fixed', value: 2000, appliesTo: 'all' });
    const one = sp({ id: 'one', name: 'One', specialType: 'fixed', value: 1500, appliesTo: 'rooms', roomIds: [RA] });
    const out = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-02-01' }, { seasons, roomRates, specials: [all, one] });
    expect(out.resolvedRate).toBe(1500);
    expect(out.special.id).toBe('one');
  });
  it('multi beats all', () => {
    const all = sp({ id: 'all', name: 'All', specialType: 'fixed', value: 2000, appliesTo: 'all' });
    const multi = sp({ id: 'm', name: 'M', specialType: 'fixed', value: 1800, appliesTo: 'rooms', roomIds: [RA, RB] });
    expect(classifySpecialPriority(multi, RA)).toBe('multi');
    const out = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-02-01' }, { seasons, roomRates, specials: [all, multi] });
    expect(out.resolvedRate).toBe(1800);
  });
  it('specific beats multi', () => {
    const multi = sp({ id: 'm', name: 'M', specialType: 'fixed', value: 1800, appliesTo: 'rooms', roomIds: [RA, RB] });
    const one = sp({ id: 'one', name: 'One', specialType: 'fixed', value: 1400, appliesTo: 'rooms', roomIds: [RA] });
    const out = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-02-01' }, { seasons, roomRates, specials: [multi, one] });
    expect(out.resolvedRate).toBe(1400);
  });
  it('same-priority conflict throws', () => {
    const a = sp({ id: 'c1', name: 'A', specialType: 'fixed', value: 1000, appliesTo: 'rooms', roomIds: [RA] });
    const b = sp({ id: 'c2', name: 'B', specialType: 'fixed', value: 1100, appliesTo: 'rooms', roomIds: [RA] });
    expect(() => resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-02-01' }, { seasons, roomRates, specials: [a, b] }))
      .toThrow(expect.objectContaining({ code: RateErrorCodes.CONFLICTING_SPECIALS }));
  });
  it('inactive special ignored', () => {
    const special = sp({ id: 'off', name: 'Off', specialType: 'fixed', value: 100, appliesTo: 'all', active: false });
    const out = resolveRoomRateFromContext({ businessId: BIZ, roomId: RA, stayDate: '2026-02-01' }, { seasons, roomRates, specials: [special] });
    expect(out.resolvedRate).toBe(2500);
    expect(out.special.id).toBeNull();
  });
});

describe('isolation and provider', () => {
  it('ignores other business data', () => {
    const otherSeason = s({ id: 'os', name: 'Low', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', businessId: BIZ2 });
    const otherRate = r({ id: 'or', roomId: RA, seasonId: otherSeason.id, rateAmount: 9999, businessId: BIZ2 });
    expect(() => resolveRoomRateFromContext(
      { businessId: BIZ, roomId: RA, stayDate: '2026-02-01' },
      { seasons: [otherSeason], roomRates: [otherRate], specials: [] }
    )).toThrow(expect.objectContaining({ code: RateErrorCodes.MISSING_SEASON }));
  });
  it('Manual provider scopes by business', async () => {
    const repo = new InMemoryRateRepository({ seasons: [low, { ...mid, businessId: BIZ2 }] });
    const provider = new ManualFastCheckInProvider(repo);
    const list = await provider.getSeasons({ businessId: BIZ });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(low.id);
  });
  it('resolveRoomRate has no write side effects', async () => {
    const repo = new InMemoryRateRepository({ seasons: [low], roomRates: [rateLow], specials: [] });
    const result = await resolveRoomRate({ businessId: BIZ, roomId: RA, stayDate: '2026-02-10' }, repo);
    expect(result.resolvedRate).toBe(2500);
    expect(result.provider).toBe('manual');
    expect(result.currency).toBe('ZAR');
    expect(result.baseRateAmount).toBe(2500);
    expect((await repo.listRoomRates(BIZ)).length).toBe(1);
  });
});
