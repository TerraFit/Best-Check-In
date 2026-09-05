import auth from './_auth.cjs';

const { ACTOR_TYPES, requirePlatformActor, requirePlatformPermission, authFailure } = auth;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  const auth = requirePlatformActor(event);
  if (!auth.ok) return authFailure(auth, headers);
  if (!requirePlatformPermission(auth.principal, 'platform:analytics:read')) {
    return authFailure({ status: 403, error: 'Missing permission: platform:analytics:read' }, headers);
  }

  const businessId = event.queryStringParameters?.businessId;
  if (!businessId) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'businessId required' }) };
  }

  try {
    const { fetchBusiness, buildAnalyticsSummary } = await import('./lib/analytics/pipeline.js');
    const business = await fetchBusiness(businessId);
    if (!business) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business not found' }) };
    }

    const range = event.queryStringParameters?.dateRange || '30days';
    const end = new Date();
    const start = new Date(end);
    if (range === '90days') start.setDate(start.getDate() - 90);
    else if (range === '12months') start.setFullYear(start.getFullYear() - 1);
    else start.setDate(start.getDate() - 30);

    const dateFrom = start.toISOString().slice(0, 10);
    const dateTo = end.toISOString().slice(0, 10);
    const summary = await buildAnalyticsSummary({ businessId, dateFrom, dateTo });

    const { fetchBookingsForAnalytics } = await import('./lib/analytics/pipeline.js');
    const { enrichBookingGeo } = await import('./lib/analytics/metrics.js');
    const { bookings } = await fetchBookingsForAnalytics(businessId, dateFrom, dateTo);
    const completed = bookings.filter((b) => b.status === 'completed').map(enrichBookingGeo);

    const provinces = {};
    const cities = {};
    const months = {};
    completed.forEach((booking) => {
      const province = booking._region || booking.guest_province;
      const city = booking._city || booking.guest_city;
      if (province) provinces[province] = (provinces[province] || 0) + 1;
      if (city) cities[city] = (cities[city] || 0) + 1;
      if (booking.check_in_date) {
        const month = new Date(`${booking.check_in_date}T00:00:00Z`).toLocaleString('en-ZA', { month: 'short', timeZone: 'UTC' });
        months[month] = (months[month] || 0) + 1;
      }
    });

    const summaryData = summary.summary || {};
    const occupancy = Number(summaryData.occupancy || 0);
    const totalRevenue = Number(summaryData.totalRevenue || 0);
    const isSuperAdmin = auth.principal.actorType === ACTOR_TYPES.SUPER_ADMIN;

    const businessResponse = {
      id: business.id,
      trading_name: business.trading_name,
      registered_name: business.registered_name,
      email: business.email,
      phone: business.phone,
      physical_address: business.physical_address,
      status: business.status,
      created_at: business.created_at,
    };

    if (isSuperAdmin) {
      businessResponse.subscription_tier = business.subscription_tier;
      businessResponse.subscription_status = business.subscription_status || 'active';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        business: businessResponse,
        analytics: {
          total_bookings: Number(summaryData.totalBookings || 0),
          total_guests: Number(summaryData.totalGuests || 0),
          total_nights: Number(summaryData.totalNights || 0),
          occupancy_rate: occupancy,
          monthly_breakdown: months,
          guest_origins: {
            countries: Object.fromEntries((summary.originCountries || []).map((x) => [x.name, x.total])),
            provinces,
            cities,
          },
          arriving_from: summary.arrivingFrom || [],
          going_to: summary.goingTo || [],
          total_revenue: totalRevenue,
          average_stay: Number(summaryData.averageStay || 0),
          returning_rate: Number(summaryData.returningRate || 0),
        },
        comparisons: {
          rankings: {
            rank_overall: null,
            rank_province: null,
            rank_city: null,
            percentile_overall: null,
            percentile_province: null,
            percentile_city: null,
          },
          province_average: { avg_occupancy: null, avg_bookings: null },
        },
        meta: summary.meta,
      }),
    };
  } catch (error) {
    console.error('get-business-analytics error:', error?.message || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal Server Error' }),
    };
  }
};
