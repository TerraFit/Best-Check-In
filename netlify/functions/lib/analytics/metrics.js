/**
 * Shared metrics for Analytics Intelligence pipeline.
 * Occupancy uses room-nights sold / sellable room-nights — never bookings/30.
 */

import {
  getContinent,
  normalizeCountry,
  normalizeRegion,
  normalizeCity,
  isSouthAfrica,
} from './geoHierarchy.js';

export function parseDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export function daysInclusive(fromStr, toStr) {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

/** Default analytics window: last 90 days inclusive ending today (UTC date). */
export function defaultDateRange() {
  const to = new Date();
  const toStr = to.toISOString().split('T')[0];
  const from = new Date(to);
  from.setDate(from.getDate() - 89);
  return { dateFrom: from.toISOString().split('T')[0], dateTo: toStr };
}

export function resolveDateRange(dateFrom, dateTo) {
  const defaults = defaultDateRange();
  const from = parseDateOnly(dateFrom) || defaults.dateFrom;
  const to = parseDateOnly(dateTo) || defaults.dateTo;
  if (from > to) return { dateFrom: to, dateTo: from };
  return { dateFrom: from, dateTo: to };
}

export function bookingNights(b) {
  const n = Number(b.nights);
  if (n > 0) return n;
  if (b.check_in_date && b.check_out_date) {
    return Math.max(1, daysInclusive(b.check_in_date, b.check_out_date) - 1 || 1);
  }
  return 1;
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
 * Occupancy rate (%) for period.
 * roomNightsSold / (sellableRooms × days in period)
 */
export function calculateOccupancy(bookings, sellableRooms, dateFrom, dateTo) {
  const rooms = Math.max(1, Number(sellableRooms) || 1);
  const days = daysInclusive(dateFrom, dateTo);
  const sellableNights = rooms * days;
  const sold = bookings.reduce((sum, b) => sum + bookingNights(b), 0);
  const rate = sellableNights > 0 ? Math.min(100, (sold / sellableNights) * 100) : 0;
  return {
    roomNightsSold: sold,
    sellableRoomNights: sellableNights,
    sellableRooms: rooms,
    daysInPeriod: days,
    occupancyRate: Math.round(rate * 100) / 100,
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

    totalNights += bookingNights(b);
    totalGuests += bookingGuests(b);
    totalRevenue += Number(b.total_amount || b.totalAmount || 0) || 0;
    if (hasMarketingConsent(b)) consentYes++;

    const source = (b.booking_source || b.referral_source || '').toString().trim();
    if (source && source.toLowerCase() !== 'null') {
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

  let returningBookings = 0;
  emailSeen.forEach((c) => {
    if (c > 1) returningBookings += c - 1; // subsequent stays after first
  });
  // Alternative rate: share of bookings whose email appears more than once
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
      percentage: Math.round((count / total) * 10000) / 100,
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

/** City-level insight panel metrics for a filtered booking set */
export function cityDashboard(bookings) {
  const s = summarizeBookings(
    bookings,
    1,
    bookings[0]?.check_in_date || defaultDateRange().dateFrom,
    bookings[bookings.length - 1]?.check_in_date || defaultDateRange().dateTo
  );
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
  };
}
