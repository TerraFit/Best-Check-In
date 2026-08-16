/**
 * Shared metrics for Analytics Intelligence pipeline.
 * Occupancy uses overlapping room-nights sold / sellable room-nights — never bookings/30.
 * Eligibility and night rules live in businessRules.js (canonical).
 */

import {
  getContinent,
  normalizeCountry,
  normalizeRegion,
  normalizeCity,
  isSouthAfrica,
} from './geoHierarchy.js';
import { resolvePlaceAlias } from './locationAliases.js';
import {
  resolveDateRange,
  defaultDateRange,
  bookingNights,
  overlappingNights,
  daysInclusive,
  toDateOnly,
  ANALYTICS_TIMEZONE,
} from './businessRules.js';

export {
  resolveDateRange,
  defaultDateRange,
  bookingNights,
  overlappingNights,
  daysInclusive,
  toDateOnly,
  ANALYTICS_TIMEZONE,
};

export function parseDateOnly(value) {
  return toDateOnly(value);
}

export function bookingGuests(b) {
  const adults = Number(b.adults) || 0;
  const children = Number(b.children) || 0;
  const total = adults + children;
  return total > 0 ? total : 1;
}

export function hasMarketingConsent(b) {
  const v = b.marketing_consent ?? b.popia_marketing_consent ?? b.popiaMarketingConsent;
  return v === true || v === 'true' || v === 1 || v === '1';
}

/**
 * Return a stable analytics code for known referral-source variants.
 * Unknown/custom sources are preserved exactly as supplied.
 */
export function normalizeReferralSource(value) {
  const source = String(value ?? '').trim();
  if (!source || source.toLowerCase() === 'null') return '';

  const key = source.toLowerCase().replace(/\s+/g, ' ');
  if (key === 'word of mouth') return 'word_of_mouth';
  if (key === 'research engine') return 'research_engine';

  return source;
}

/**
 * Occupancy for a set of already-eligible, period-relevant bookings.
 * Uses overlapping nights within [dateFrom, dateTo], not full booking length outside period.
 * MVP sellable nights = sellableRooms × daysInPeriod (not maintenance-adjusted).
 */
export function calculateOccupancy(bookings, sellableRooms, dateFrom, dateTo) {
  const rooms = Math.max(1, Number(sellableRooms) || 1);
  const days = daysInclusive(dateFrom, dateTo);
  const sellableNights = rooms * days;
  const sold = (bookings || []).reduce(
    (sum, b) => sum + overlappingNights(b, dateFrom, dateTo),
    0
  );
  const rate = sellableNights > 0 ? Math.min(100, (sold / sellableNights) * 100) : 0;
  return {
    roomNightsSold: sold,
    sellableRoomNights: sellableNights,
    sellableRooms: rooms,
    daysInPeriod: days,
    occupancyRate: Math.round(rate * 100) / 100,
    occupancyModel: 'mvp_total_rooms',
    timezone: ANALYTICS_TIMEZONE,
  };
}

export function intensityScale(count, maxCount) {
  if (!maxCount || maxCount <= 0) return 0;
  return Math.min(1, count / maxCount);
}

export function buildOriginNodes(countMap, total) {
  const entries = Object.entries(countMap).filter(([k]) => k && k !== '');
  const max = entries.reduce((m, [, c]) => Math.max(m, c), 0);
  const t = total || entries.reduce((s, [, c]) => s + c, 0) || 1;
  return entries
    .map(([name, count]) => ({
      key: name,
      name,
      count,
      percentage: Math.round((count / t) * 10000) / 100,
      intensity: intensityScale(count, max),
      hasChildren: true,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Summarise eligible overlapping stays.
 * totalNights = sum of overlapping nights in period (not full booking length outside period).
 */
export function summarizeBookings(bookings, sellableRooms, dateFrom, dateTo) {
  const total = bookings.length;
  let domestic = 0;
  let international = 0;
  const countrySet = new Set();
  let totalNights = 0;
  let totalGuests = 0;
  let totalRevenue = 0;
  let consentYes = 0;
  const referralMap = {};
  const monthMap = {};
  const emailSeen = new Map();

  bookings.forEach((b) => {
    const country = normalizeCountry(b.guest_country || b.country);
    if (isSouthAfrica(country)) domestic++;
    else if (country !== 'Unknown') international++;
    if (country !== 'Unknown') countrySet.add(country);

    totalNights += overlappingNights(b, dateFrom, dateTo);
    totalGuests += bookingGuests(b);
    totalRevenue += Number(b.total_amount || b.totalAmount || 0) || 0;
    if (hasMarketingConsent(b)) consentYes++;

    const source = normalizeReferralSource(b.booking_source || b.referral_source || '');
    if (source) {
      referralMap[source] = (referralMap[source] || 0) + 1;
    }

    if (b.check_in_date) {
      const d = new Date(b.check_in_date);
      if (!Number.isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('en', { month: 'short', year: 'numeric' });
        if (!monthMap[key]) monthMap[key] = { key, label, count: 0 };
        monthMap[key].count++;
      }
    }

    const email = (b.guest_email || b.email || '').toString().toLowerCase().trim();
    if (email) {
      emailSeen.set(email, (emailSeen.get(email) || 0) + 1);
    }
  });

  let multiEmailBookings = 0;
  bookings.forEach((b) => {
    const email = (b.guest_email || b.email || '').toString().toLowerCase().trim();
    if (email && (emailSeen.get(email) || 0) > 1) multiEmailBookings++;
  });

  const occupancy = calculateOccupancy(bookings, sellableRooms, dateFrom, dateTo);
  const avgStay = total > 0 ? Math.round((totalNights / total) * 100) / 100 : 0;
  const avgParty = total > 0 ? Math.round((totalGuests / total) * 100) / 100 : 0;
  const consentRate = total > 0 ? Math.round((consentYes / total) * 10000) / 100 : 0;
  const returningRate =
    total > 0 ? Math.round((multiEmailBookings / total) * 10000) / 100 : 0;

  const referralData = Object.entries(referralMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const monthlyTrend = Object.values(monthMap).sort((a, b) =>
    a.key.localeCompare(b.key)
  );

  const topReferral = referralData[0]?.name || null;
  const topMonth = [...monthlyTrend].sort((a, b) => b.count - a.count)[0]?.label || null;

  return {
    totalBookings: total,
    totalGuests,
    totalNights,
    totalRevenue,
    averageStay: avgStay,
    averagePartySize: avgParty,
    uniqueCountries: countrySet.size,
    domesticCount: domestic,
    internationalCount: international,
    domesticPercentage: total > 0 ? Math.round((domestic / total) * 10000) / 100 : 0,
    internationalPercentage:
      total > 0 ? Math.round((international / total) * 10000) / 100 : 0,
    consentYes,
    consentRate,
    returningRate,
    topReferral,
    topMonth,
    occupancy,
    referralData,
    monthlyTrend,
  };
}

export function cityDashboard(bookings) {
  const from =
    bookings[0]?.check_in_date || defaultDateRange().dateFrom;
  const to =
    bookings[bookings.length - 1]?.check_in_date || defaultDateRange().dateTo;
  const s = summarizeBookings(bookings, 1, from, to);
  return {
    visitors: s.totalBookings,
    averageStay: s.averageStay,
    returningGuestsPercent: s.returningRate,
    marketingConsentPercent: s.consentRate,
    averagePartySize: s.averagePartySize,
    topReferral: s.topReferral,
    topMonth: s.topMonth,
  };
}

export function enrichBookingGeo(b) {
  const country = normalizeCountry(b.guest_country || b.country);
  return {
    ...b,
    _country: country,
    _continent: getContinent(country),
    _region: normalizeRegion(b.guest_province || b.province),
    _city: normalizeCity(b.guest_city || b.city),
    _arriving_from: resolvePlaceAlias(b.arriving_from || ''),
    _next_destination: resolvePlaceAlias(b.next_destination || ''),
  };
}
