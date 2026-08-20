// netlify/functions/get-business-bookings.js
// Includes room fields for Overview cards (Phase 1.1)
// Filters (status, province, city, country, search) applied at DB level BEFORE pagination.

const jwt = require('jsonwebtoken');

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  },
  body: JSON.stringify(body)
});

/**
 * Encode a value for PostgREST query string (safe for eq/ilike).
 */
function encodeParam(value) {
  return encodeURIComponent(String(value).trim());
}

/**
 * Build shared filter query fragment (without select/limit/offset/order).
 * Empty/null/blank filter values are ignored.
 */
function buildFilterQuery(params) {
  const {
    targetBusinessId,
    startDate,
    endDate,
    status,
    province,
    city,
    country,
    search
  } = params;

  let q = `business_id=eq.${encodeParam(targetBusinessId)}`;

  if (startDate && endDate) {
    q += `&check_in_date=gte.${encodeParam(startDate)}&check_in_date=lte.${encodeParam(endDate)}`;
  } else if (startDate && !endDate) {
    q += `&check_in_date=gte.${encodeParam(startDate)}`;
  }

  if (status) {
    q += `&status=eq.${encodeParam(status)}`;
  }
  if (province) {
    q += `&guest_province=eq.${encodeParam(province)}`;
  }
  if (city) {
    q += `&guest_city=eq.${encodeParam(city)}`;
  }
  if (country) {
    // Match exact stored value; clients send values from facets
    q += `&guest_country=eq.${encodeParam(country)}`;
  }
  if (search) {
    const term = String(search).trim();
    if (term.length > 0) {
      // PostgREST or() with ilike across name/email/phone
      const like = `*${term}*`;
      q += `&or=(guest_name.ilike.${encodeParam(like)},guest_email.ilike.${encodeParam(like)},guest_phone.ilike.${encodeParam(like)})`;
    }
  }

  return q;
}

/**
 * Normalise facet values: drop null/empty/blank, trim, dedupe, sort.
 */
function cleanFacetValues(rows, field) {
  const set = new Set();
  for (const row of rows || []) {
    let v = row[field];
    if (v == null) continue;
    v = String(v).trim().replace(/\.$/, '');
    if (!v) continue;
    set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});
  if (event.httpMethod !== 'GET') return createResponse(405, { success: false, error: 'Method Not Allowed' });

  try {
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) return createResponse(401, { success: false, error: 'No authorization token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return createResponse(401, { success: false, error: 'Token has expired' });
      }
      return createResponse(401, { success: false, error: 'Invalid token signature' });
    }

    const businessIdFromToken = decoded.user_metadata?.business_id;
    if (!businessIdFromToken) {
      return createResponse(403, { success: false, error: 'Token missing business ID' });
    }

    const q = event.queryStringParameters || {};
    const {
      businessId: businessIdFromQuery,
      startDate,
      endDate,
      limit = '25',
      page = '1',
      status,
      province,
      city,
      country,
      search,
      includeFacets
    } = q;

    const targetBusinessId = businessIdFromQuery || businessIdFromToken;

    if (businessIdFromQuery && businessIdFromToken && businessIdFromQuery !== businessIdFromToken) {
      return createResponse(403, { success: false, error: 'Forbidden' });
    }

    if (!targetBusinessId) {
      return createResponse(400, { success: false, error: 'Missing businessId parameter' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return createResponse(500, { success: false, error: 'Server configuration error' });
    }

    const BOOKINGS_TABLE = 'bookings';
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(10000, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const filterParams = {
      targetBusinessId,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status && String(status).trim() ? String(status).trim() : null,
      province: province && String(province).trim() ? String(province).trim() : null,
      city: city && String(city).trim() ? String(city).trim() : null,
      country: country && String(country).trim() ? String(country).trim() : null,
      search: search && String(search).trim() ? String(search).trim() : null
    };

    const filterQuery = buildFilterQuery(filterParams);

    // Phase 1.1: include denormalised room fields already on the booking
    const selectFields = [
      'id', 'business_id', 'guest_name', 'guest_first_name', 'guest_last_name',
      'guest_email', 'guest_phone', 'guest_id_number',
      'check_in_date', 'check_out_date', 'nights', 'adults', 'children', 'total_amount',
      'status', 'guest_province', 'guest_city', 'guest_country',
      'booking_source', 'referral_source', 'marketing_consent',
      'arriving_from', 'next_destination', 'created_at', 'updated_at',
      'room_id', 'room_number', 'room_name'
    ].join(',');

    const dataUrl =
      `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?${filterQuery}` +
      `&select=${selectFields}&order=check_in_date.desc&limit=${limitNum}&offset=${offset}`;

    const response = await fetch(dataUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'count=exact'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const bookings = await response.json();
    const contentRange = response.headers.get('content-range') || response.headers.get('Content-Range') || '';
    // content-range: 0-24/1234  or  */0
    let totalBookings = 0;
    const slashIdx = contentRange.lastIndexOf('/');
    if (slashIdx >= 0) {
      const totalPart = contentRange.slice(slashIdx + 1).trim();
      const parsed = parseInt(totalPart, 10);
      if (!Number.isNaN(parsed)) totalBookings = parsed;
    } else {
      // Fallback: length of page (should be rare)
      totalBookings = Array.isArray(bookings) ? bookings.length : 0;
    }
    const totalPages = Math.max(1, Math.ceil(totalBookings / limitNum));

    // Food restrictions (best-effort, same as before)
    if (bookings.length > 0) {
      try {
        const testResponse = await fetch(
          `${supabaseUrl}/rest/v1/booking_food_restrictions?limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`
            }
          }
        );

        if (!testResponse.ok) {
          bookings.forEach((booking) => {
            booking.food_restrictions = null;
          });
        } else {
          const restrictionsResponse = await fetch(
            `${supabaseUrl}/rest/v1/booking_food_restrictions?select=*`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
              }
            }
          );

          if (restrictionsResponse.ok) {
            const allRestrictions = await restrictionsResponse.json();
            const bookingIdSet = new Set(bookings.map((b) => b.id));
            const matchingRestrictions = allRestrictions.filter((r) => bookingIdSet.has(r.booking_id));
            const restrictionsMap = {};
            matchingRestrictions.forEach((r) => {
              restrictionsMap[r.booking_id] = r;
            });
            bookings.forEach((booking) => {
              booking.food_restrictions = restrictionsMap[booking.id] || null;
            });
          } else {
            bookings.forEach((booking) => {
              booking.food_restrictions = null;
            });
          }
        }
      } catch (err) {
        bookings.forEach((booking) => {
          booking.food_restrictions = null;
        });
      }
    }

    // Facets: distinct values for the business (date-scoped if dates provided, else full business).
    // Facets intentionally ignore status/province/city/country/search so dropdowns show full population.
    let facets = null;
    const wantFacets =
      includeFacets === '1' ||
      includeFacets === 'true' ||
      includeFacets === true;

    if (wantFacets) {
      // Base scope: business + optional date only
      let facetBase = `business_id=eq.${encodeParam(targetBusinessId)}`;
      if (filterParams.startDate && filterParams.endDate) {
        facetBase += `&check_in_date=gte.${encodeParam(filterParams.startDate)}&check_in_date=lte.${encodeParam(filterParams.endDate)}`;
      } else if (filterParams.startDate) {
        facetBase += `&check_in_date=gte.${encodeParam(filterParams.startDate)}`;
      }

      const headers = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      };

      // Parallel distinct-ish fetches (PostgREST has no DISTINCT; select column + dedupe)
      // Cap rows to avoid huge payloads; 5000 is ample for unique geo values per business.
      const [statusRows, provinceRows, cityRows, countryRows] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?${facetBase}&select=status&limit=5000`,
          { headers }
        ).then((r) => (r.ok ? r.json() : [])),
        fetch(
          `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?${facetBase}&select=guest_province&limit=5000`,
          { headers }
        ).then((r) => (r.ok ? r.json() : [])),
        fetch(
          `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?${facetBase}&select=guest_city&limit=5000`,
          { headers }
        ).then((r) => (r.ok ? r.json() : [])),
        fetch(
          `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?${facetBase}&select=guest_country&limit=5000`,
          { headers }
        ).then((r) => (r.ok ? r.json() : []))
      ]);

      facets = {
        statuses: cleanFacetValues(statusRows, 'status'),
        provinces: cleanFacetValues(provinceRows, 'guest_province'),
        cities: cleanFacetValues(cityRows, 'guest_city'),
        countries: cleanFacetValues(countryRows, 'guest_country')
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const todayCheckIns = bookings.filter((b) => b.check_in_date === todayStr).length;
    const todayCheckOuts = bookings.filter((b) => b.check_out_date === todayStr).length;

    const todayStayovers = bookings.filter((b) => {
      if (!b.check_in_date) return false;
      const checkInDate = new Date(b.check_in_date);
      checkInDate.setHours(0, 0, 0, 0);
      if (checkInDate.getTime() === today.getTime()) return false;
      if (checkInDate > today) return false;
      if (!b.check_out_date) return true;
      const checkOutDate = new Date(b.check_out_date);
      checkOutDate.setHours(0, 0, 0, 0);
      return checkOutDate >= today;
    }).length;

    const body = {
      success: true,
      bookings,
      total_count: totalBookings,
      page: pageNum,
      limit: limitNum,
      total_pages: totalPages,
      today_activity: {
        arrivals: todayCheckIns,
        stayovers: todayStayovers,
        checkouts: todayCheckOuts
      },
      applied_filters: {
        status: filterParams.status,
        province: filterParams.province,
        city: filterParams.city,
        country: filterParams.country,
        search: filterParams.search,
        startDate: filterParams.startDate,
        endDate: filterParams.endDate
      }
    };

    if (facets) {
      body.facets = facets;
    }

    return createResponse(200, body);
  } catch (err) {
    console.error('get-business-bookings error:', err);
    return createResponse(500, {
      success: false,
      error: 'Internal Server Error',
      message: err.message
    });
  }
};
