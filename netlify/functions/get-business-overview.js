const { requireSuperAdmin, authFailure } = require('./_auth.cjs');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  const auth = requireSuperAdmin(event);
  if (!auth.ok) return authFailure(auth, headers);

  const businessId = event.queryStringParameters?.businessId;
  if (!businessId) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'businessId required' }) };
  }

  try {
    const { fetchBusiness, buildAnalyticsSummary } = await import('./lib/analytics/pipeline.js');
    const { getAnalyticsPlanLimits } = await import('./lib/analytics/packageGates.js');
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
    const limits = getAnalyticsPlanLimits(summary.meta.plan);

    const monthlyBreakdown = Object.fromEntries(
      (summary.monthlyTrend || []).map((row) => [row.month, row.count ?? row.bookings ?? 0])
    );

    const provinceCounts = {};
    const cityCounts = {};
    const { fetchBookingsForAnalytics } = await import('./lib/analytics/pipeline.js');
    const { enrichBookingGeo } = await import('./lib/analytics/metrics.js');
    const { bookings } = await fetchBookingsForAnalytics(businessId, dateFrom, dateTo);
    bookings.filter((b) => b.status === 'completed').map(enrichBookingGeo).forEach((b) => {
      const province = b._region || b.guest_province;
      const city = b._city || b.guest_city;
      if (province) provinceCounts[province] = (provinceCounts[province] || 0) + 1;
      if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    const totalBookings = Number(summary.summary?.totalBookings || 0);
    const totalRevenue = Number(summary.summary?.totalRevenue || 0);
    const occupancy = Number(summary.summary?.occupancy || 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        business: {
          id: business.id,
          trading_name: business.trading_name,
          registered_name: business.registered_name,
          email: business.email,
          phone: business.phone,
          physical_address: business.physical_address,
          status: business.status,
          subscription_tier: business.subscription_tier,
          subscription_status: business.subscription_status || 'active',
          created_at: business.created_at,
        },
        analytics: {
          total_bookings: totalBookings,
          total_guests: summary.summary?.totalGuests || 0,
          total_nights: summary.summary?.totalNights || 0,
          occupancy_rate: occupancy,
          monthly_breakdown: monthlyBreakdown,
          guest_origins: {
            countries: Object.fromEntries((summary.originCountries || []).map((x) => [x.name, x.total])),
            provinces: provinceCounts,
            cities: cityCounts,
          },
          arriving_from: summary.arrivingFrom || [],
          going_to: summary.goingTo || [],
          total_revenue: totalRevenue,
          average_stay: summary.summary?.averageStay || 0,
          returning_rate: summary.summary?.returningRate || 0,
        },
        comparisons: {
          rankings: { rank_overall: null, rank_province: null, rank_city: null, percentile_overall: null, percentile_province: null, percentile_city: null },
          province_average: { avg_occupancy: null, avg_bookings: null },
        },
        meta: { ...summary.meta, limits },
      }),
    };
  } catch (error) {
    console.error('get-business-overview error:', error?.message || error);
    return { statusCode: error.statusCode || 500, headers, body: JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }) };
  }
};
