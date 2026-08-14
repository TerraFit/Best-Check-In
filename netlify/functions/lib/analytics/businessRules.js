/**
 * Canonical Analytics Intelligence business rules.
 * Single source of truth for eligibility, nights, timezone, and period overlap.
 * Africa/Johannesburg is the analytics calendar timezone.
 */

export const ANALYTICS_TIMEZONE = 'Africa/Johannesburg';

/** Statuses that never contribute to sold stay analytics (aligned with get-rooms). */
const EXCLUDED_STATUSES = new Set(['cancelled', 'canceled', 'no_show']);

/**
 * Pre-arrival / reserved-like statuses: excluded from sold nights (spec OD-3 recommendation).
 * Expand when production enum is fully inventoried.
 */
const PRE_ARRIVAL_STATUSES = new Set([
  'confirmed',
  'reserved',
  'pending',
  'booked',
]);

/**
 * Statuses treated as completed / in-house stays when present.
 */
const INCLUDE_STATUSES = new Set([
  'checked_in',
  'checked_out',
  'checkedin',
  'checkedout',
  'complete',
  'completed',
]);

/**
 * Calendar date YYYY-MM-DD in Africa/Johannesburg for "today".
 */
export function todayInJohannesburg() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ANALYTICS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Normalise a value to YYYY-MM-DD or null (no TZ shift beyond string slice).
 */
export function toDateOnly(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Inclusive calendar-day count between two YYYY-MM-DD strings.
 */
export function daysInclusive(fromStr, toStr) {
  const from = toDateOnly(fromStr);
  const to = toDateOnly(toStr);
  if (!from || !to) return 1;
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  return Math.max(1, Math.floor((b.getTime() - a.getTime()) / 86400000) + 1);
}

/**
 * Exclusive night count between check-in and check-out (hotel standard).
 * Same-day or invalid → 1 night.
 */
export function nightsBetween(checkIn, checkOut) {
  const ci = toDateOnly(checkIn);
  const co = toDateOnly(checkOut);
  if (!ci) return 1;
  if (!co || co <= ci) return 1;
  const a = new Date(`${ci}T00:00:00Z`);
  const b = new Date(`${co}T00:00:00Z`);
  return Math.max(1, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

/**
 * Booking nights for analytics: prefer stored nights > 0, else date-derived.
 */
export function bookingNights(b) {
  const n = Number(b?.nights);
  if (n > 0) return n;
  return nightsBetween(b?.check_in_date, b?.check_out_date);
}

/**
 * Normalised status string.
 */
export function normalizeStatus(status) {
  return String(status || '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
}

/**
 * Whether a booking is eligible for sold-stay analytics.
 */
export function isEligibleStay(b) {
  const s = normalizeStatus(b?.status);
  if (!s) return true;
  if (EXCLUDED_STATUSES.has(s)) return false;
  if (PRE_ARRIVAL_STATUSES.has(s)) return false;
  if (INCLUDE_STATUSES.has(s)) return true;
  return false;
}

/**
 * Classification for quality meta.
 */
export function classifyStayStatus(b) {
  const s = normalizeStatus(b?.status);
  if (!s) return 'legacy_null';
  if (EXCLUDED_STATUSES.has(s)) return 'excluded_cancelled_or_noshow';
  if (PRE_ARRIVAL_STATUSES.has(s)) return 'excluded_pre_arrival';
  if (INCLUDE_STATUSES.has(s)) return 'eligible';
  return 'excluded_unknown';
}

/**
 * Number of nights of booking that overlap [dateFrom, dateTo] inclusive.
 */
export function overlappingNights(b, dateFrom, dateTo) {
  const from = toDateOnly(dateFrom);
  const to = toDateOnly(dateTo);
  if (!from || !to) return 0;

  const ci = toDateOnly(b?.check_in_date);
  if (!ci) return 0;

  let co = toDateOnly(b?.check_out_date);
  if (!co || co <= ci) {
    if (ci >= from && ci <= to) return 1;
    return 0;
  }

  let count = 0;
  const start = new Date(`${ci}T00:00:00Z`);
  const end = new Date(`${co}T00:00:00Z`);
  const periodStart = new Date(`${from}T00:00:00Z`);
  const periodEnd = new Date(`${to}T00:00:00Z`);

  for (let t = start.getTime(); t < end.getTime(); t += 86400000) {
    if (t >= periodStart.getTime() && t <= periodEnd.getTime()) count += 1;
  }
  return count;
}

export function stayOverlapsPeriod(b, dateFrom, dateTo) {
  return overlappingNights(b, dateFrom, dateTo) > 0;
}

export function filterEligibleOverlapping(bookings, dateFrom, dateTo) {
  const list = Array.isArray(bookings) ? bookings : [];
  return list.filter(
    (b) => isEligibleStay(b) && stayOverlapsPeriod(b, dateFrom, dateTo)
  );
}

export function buildQualityMeta(allBookings, eligible, dateFrom, dateTo) {
  const list = Array.isArray(allBookings) ? allBookings : [];
  let excludedByStatus = 0;
  let legacyNull = 0;
  let missingCheckout = 0;
  let missingCountry = 0;
  let allocated = 0;

  list.forEach((b) => {
    const cls = classifyStayStatus(b);
    if (cls.startsWith('excluded')) excludedByStatus += 1;
    if (cls === 'legacy_null') legacyNull += 1;
    if (!toDateOnly(b?.check_out_date)) missingCheckout += 1;
    const country = String(b?.guest_country || '').trim();
    if (!country) missingCountry += 1;
  });

  eligible.forEach((b) => {
    if (b?.room_id) allocated += 1;
  });

  const eligibleStays = eligible.length;
  const allocationCoveragePct =
    eligibleStays > 0
      ? Math.round((allocated / eligibleStays) * 10000) / 100
      : 100;

  return {
    eligibleStays,
    excludedByStatus,
    legacyNullStatus: legacyNull,
    missingCheckoutPct:
      list.length > 0
        ? Math.round((missingCheckout / list.length) * 10000) / 100
        : 0,
    missingCountryPct:
      list.length > 0
        ? Math.round((missingCountry / list.length) * 10000) / 100
        : 0,
    allocationCoveragePct,
    allocatedStays: allocated,
    periodTimezone: ANALYTICS_TIMEZONE,
    occupancyModel: 'mvp_total_rooms',
    dateFrom: toDateOnly(dateFrom),
    dateTo: toDateOnly(dateTo),
  };
}

export function defaultDateRange() {
  const toStr = todayInJohannesburg();
  const to = new Date(`${toStr}T12:00:00Z`);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 89);
  const fromStr = from.toISOString().slice(0, 10);
  return { dateFrom: fromStr, dateTo: toStr };
}

export function resolveDateRange(dateFrom, dateTo) {
  const defaults = defaultDateRange();
  const from = toDateOnly(dateFrom) || defaults.dateFrom;
  const to = toDateOnly(dateTo) || defaults.dateTo;
  if (from > to) return { dateFrom: to, dateTo: from };
  return { dateFrom: from, dateTo: to };
}
