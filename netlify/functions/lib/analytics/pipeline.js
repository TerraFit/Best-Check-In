/**
 * Analytics Intelligence aggregation pipeline.
 * Fetches bookings by business_id + date range and builds origin hierarchy + summary.
 */

import { supabaseFetch } from '../supabase-rest.js';
import {
  getContinent,
  getCountryIso,
  normalizeCountry,
  isSouthAfrica,
} from './geoHierarchy.js';
import { resolvePlaceAlias } from './locationAliases.js';
import {
  resolveDateRange,
  enrichBookingGeo,
  summarizeBookings,
  cityDashboard,
  buildOriginNodes,
  overlappingNights,
  normalizeReferralSource,
} from './metrics.js';
import {
  filterEligibleOverlapping,
  buildQualityMeta,
  ANALYTICS_TIMEZONE,
} from './businessRules.js';

const BOOKINGS_TABLE = 'bookings';
const BOOKING_SELECT = [
  'id', 'business_id', 'guest_name', 'guest_email', 'guest_country', 'guest_province', 'guest_city',
  'check_in_date', 'check_out_date', 'nights', 'adults', 'children', 'total_amount', 'status',
  'booking_source', 'referral_source', 'marketing_consent', 'arriving_from', 'next_destination',
  'room_id', 'room_number', 'room_name',
].join(',');

export async function fetchBusiness(businessId) {
  const rows = await supabaseFetch(
    `businesses?id=eq.${encodeURIComponent(businessId)}&select=id,trading_name,registered_name,logo_url,total_rooms,subscription_tier,current_plan,subscription_status,billing_cycle,trial_end`
  );
  const business = rows?.[0] || null;
  if (!business) return null;

  // Licensed/configured capacity is authoritative when present. Older
  // businesses can have total_rooms=0 while the room inventory is populated;
  // resolve those cases from the active room catalogue instead of defaulting
  // occupancy to one room.
  const configuredRooms = Number(business.total_rooms) || 0;
  if (configuredRooms > 0) {
    business.total_rooms_source = 'business_configuration';
    return business;
  }

  try {
    const rooms = await supabaseFetch(
      `rooms?business_id=eq.${encodeURIComponent(businessId)}&active=eq.true&select=id`
    );
    const activeRooms = Array.isArray(rooms) ? rooms.length : 0;
    business.total_rooms = activeRooms;
    business.total_rooms_source = activeRooms > 0 ? 'active_room_inventory' : 'unconfigured';
  } catch (err) {
    console.warn('Analytics room-capacity fallback unavailable:', err?.message || err);
    business.total_rooms = 0;
    business.total_rooms_source = 'unconfigured';
  }

  return business;
}

export function resolveBusinessPlan(business) {
  if (!business) return 'starter';
  const candidates = [business.current_plan, business.subscription_tier];
  for (const c of candidates) {
    if (!c) continue;
    const n = String(c).toLowerCase().trim();
    if (['starter', 'growth', 'pro', 'business', 'enterprise'].includes(n)) return n;
    if (n === 'annual' || n === 'monthly') continue;
  }
  return 'starter';
}

export async function fetchBookingsForAnalytics(businessId, dateFrom, dateTo) {
  const { dateFrom: from, dateTo: to } = resolveDateRange(dateFrom, dateTo);
  const pageSize = 1000;
  let offset = 0;
  const all = [];
  for (;;) {
    const path =
      `${BOOKINGS_TABLE}?business_id=eq.${encodeURIComponent(businessId)}` +
      `&check_in_date=lte.${to}` +
      `&or=(check_out_date.is.null,check_out_date.gte.${from})` +
      `&select=${BOOKING_SELECT}&order=check_in_date.asc&limit=${pageSize}&offset=${offset}`;
    const batch = await supabaseFetch(path);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
    if (offset > 50000) break;
  }
  return { bookings: all, dateFrom: from, dateTo: to };
}

function filterByLevel(enriched, level, parent) {
  const p = parent || {};
  if (level === 'world' || level === 'continent') return enriched;
  if (level === 'country') {
    const continent = p.continent;
    if (!continent) return enriched;
    return enriched.filter((b) => b._continent.toLowerCase() === String(continent).toLowerCase());
  }
  if (level === 'region') {
    const country = p.country;
    if (!country) return enriched;
    return enriched.filter((b) => b._country.toLowerCase() === String(country).toLowerCase());
  }
  if (level === 'city') {
    const country = p.country;
    const region = p.region;
    return enriched.filter((b) => {
      if (country && b._country.toLowerCase() !== String(country).toLowerCase()) return false;
      if (region && b._region.toLowerCase() !== String(region).toLowerCase()) return false;
      return true;
    });
  }
  return enriched;
}

function aggregateAtLevel(enriched, level, parent) {
  const filtered = filterByLevel(enriched, level, parent);
  const total = filtered.length;
  if (level === 'world' || level === 'continent') {
    const map = {};
    filtered.forEach((b) => { const k = b._continent || 'Other'; map[k] = (map[k] || 0) + 1; });
    const nodes = buildOriginNodes(map, total).map((n) => ({ ...n, code: n.name.substring(0, 3).toUpperCase(), hasChildren: true }));
    return { level: level === 'world' ? 'world' : 'continent', nodes, filtered, total };
  }
  if (level === 'country') {
    const map = {};
    filtered.forEach((b) => { const k = b._country || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    const nodes = buildOriginNodes(map, total).map((n) => ({ ...n, code: getCountryIso(n.name), continent: getContinent(n.name), hasChildren: true }));
    return { level: 'country', nodes, filtered, total };
  }
  if (level === 'region') {
    const map = {};
    filtered.forEach((b) => { const k = b._region || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    const nodes = buildOriginNodes(map, total).map((n) => ({ ...n, hasChildren: true }));
    const onlyUnknown = nodes.length === 0 || (nodes.length === 1 && nodes[0].name === 'Unknown');
    return { level: 'region', nodes, filtered, total, skipToCity: onlyUnknown };
  }
  const map = {};
  filtered.forEach((b) => { const k = b._city || 'Unknown'; map[k] = (map[k] || 0) + 1; });
  const nodes = buildOriginNodes(map, total).map((n) => ({ ...n, hasChildren: false }));
  return { level: 'city', nodes, filtered, total };
}

export async function buildVisitorOrigins({ businessId, dateFrom, dateTo, level = 'world', continent, country, region, city }) {
  const business = await fetchBusiness(businessId);
  if (!business) { const err = new Error('Business not found'); err.statusCode = 404; throw err; }
  const plan = resolveBusinessPlan(business);
  const { bookings, dateFrom: from, dateTo: to } = await fetchBookingsForAnalytics(businessId, dateFrom, dateTo);
  const eligibleRaw = filterEligibleOverlapping(bookings, from, to);
  const enriched = eligibleRaw.map(enrichBookingGeo);
  const quality = buildQualityMeta(bookings, eligibleRaw, from, to);
  const parent = { continent, country, region, city };
  const agg = aggregateAtLevel(enriched, level, parent);
  const summary = summarizeBookings(enriched, business.total_rooms, from, to);
  let cityPanel = null;
  if (level === 'city' && city) {
    const cityBookings = enriched.filter((b) => b._city.toLowerCase() === String(city).toLowerCase() && (!country || b._country.toLowerCase() === String(country).toLowerCase()) && (!region || b._region.toLowerCase() === String(region).toLowerCase()));
    cityPanel = cityDashboard(cityBookings);
  }
  return {
    meta: { businessId, businessName: business.trading_name || business.registered_name || null, dateFrom: from, dateTo: to, totalVisitors: enriched.length, domesticCount: summary.domesticCount, internationalCount: summary.internationalCount, plan, totalRooms: business.total_rooms, totalRoomsSource: business.total_rooms_source, generatedAt: new Date().toISOString(), timezone: ANALYTICS_TIMEZONE, quality },
    level: agg.level, parent, nodes: agg.nodes, skipToCity: agg.skipToCity || false, cityDashboard: cityPanel,
  };
}

function buildReferralByCountry(enriched) {
  const countryMap = new Map();
  enriched.forEach((booking) => {
    const country = booking._country || 'Unknown';
    const source = normalizeReferralSource(booking.booking_source || booking.referral_source || '') || 'Unknown';
    if (!countryMap.has(country)) countryMap.set(country, new Map());
    const sources = countryMap.get(country);
    sources.set(source, (sources.get(source) || 0) + 1);
  });
  return [...countryMap.entries()]
    .map(([country, sources]) => {
      const total = [...sources.values()].reduce((sum, count) => sum + count, 0);
      const channels = [...sources.entries()]
        .map(([source, count]) => ({ source, count, percentage: total ? Math.round((count / total) * 10000) / 100 : 0 }))
        .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
      return { country, total, channels, dominantSource: channels[0]?.source || null, dominantPercentage: channels[0]?.percentage || 0 };
    })
    .filter((row) => row.country !== 'Unknown')
    .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));
}

export async function buildAnalyticsSummary({ businessId, dateFrom, dateTo }) {
  const business = await fetchBusiness(businessId);
  if (!business) { const err = new Error('Business not found'); err.statusCode = 404; throw err; }
  const plan = resolveBusinessPlan(business);
  const { bookings, dateFrom: from, dateTo: to } = await fetchBookingsForAnalytics(businessId, dateFrom, dateTo);
  const eligibleRaw = filterEligibleOverlapping(bookings, from, to);
  const enriched = eligibleRaw.map(enrichBookingGeo);
  const quality = buildQualityMeta(bookings, eligibleRaw, from, to);
  const summary = summarizeBookings(enriched, business.total_rooms, from, to);

  const continentMap = {};
  const countryMap = {};
  enriched.forEach((b) => {
    continentMap[b._continent] = (continentMap[b._continent] || 0) + 1;
    countryMap[b._country] = (countryMap[b._country] || 0) + 1;
  });
  const originContinents = buildOriginNodes(continentMap, enriched.length);
  const originCountries = buildOriginNodes(countryMap, enriched.length).map((n) => ({ ...n, code: getCountryIso(n.name), continent: getContinent(n.name) }));

  const arrivingMap = {};
  const goingMap = {};
  enriched.forEach((b) => {
    const af = resolvePlaceAlias(b.arriving_from || b._arriving_from || '');
    const nd = resolvePlaceAlias(b.next_destination || b._next_destination || '');
    if (af) arrivingMap[af] = (arrivingMap[af] || 0) + 1;
    if (nd) goingMap[nd] = (goingMap[nd] || 0) + 1;
  });
  const t = enriched.length || 1;
  const arrivingFrom = Object.entries(arrivingMap).map(([location, count]) => ({ location, count, percentage: Math.round((count / t) * 10000) / 100 })).sort((a, b) => b.count - a.count).slice(0, 10);
  const goingTo = Object.entries(goingMap).map(([location, count]) => ({ location, count, percentage: Math.round((count / t) * 10000) / 100 })).sort((a, b) => b.count - a.count).slice(0, 10);

  const losBuckets = { '1': 0, '2-3': 0, '4-7': 0, '8+': 0 };
  enriched.forEach((b) => {
    const n = overlappingNights(b, from, to) || 1;
    if (n <= 1) losBuckets['1']++; else if (n <= 3) losBuckets['2-3']++; else if (n <= 7) losBuckets['4-7']++; else losBuckets['8+']++;
  });

  return {
    meta: { businessId, businessName: business.trading_name || business.registered_name || null, logoUrl: business.logo_url || null, dateFrom: from, dateTo: to, plan, totalRooms: business.total_rooms, totalRoomsSource: business.total_rooms_source, generatedAt: new Date().toISOString(), timezone: ANALYTICS_TIMEZONE, quality },
    summary: {
      totalBookings: summary.totalBookings, totalGuests: summary.totalGuests, totalNights: summary.totalNights, totalRevenue: summary.totalRevenue,
      averageStay: summary.averageStay, averagePartySize: summary.averagePartySize, uniqueCountries: summary.uniqueCountries,
      domesticCount: summary.domesticCount, internationalCount: summary.internationalCount, domesticPercentage: summary.domesticPercentage,
      internationalPercentage: summary.internationalPercentage, consentRate: summary.consentRate, returningRate: summary.returningRate,
      topReferral: summary.topReferral, topMonth: summary.topMonth, occupancy: summary.occupancy,
    },
    originContinents,
    originCountries,
    referralData: summary.referralData,
    referralByCountry: buildReferralByCountry(enriched),
    monthlyTrend: summary.monthlyTrend,
    arrivingFrom,
    goingTo,
    lengthOfStay: Object.entries(losBuckets).map(([bucket, count]) => ({ bucket, count, percentage: enriched.length > 0 ? Math.round((count / enriched.length) * 10000) / 100 : 0 })),
  };
}
