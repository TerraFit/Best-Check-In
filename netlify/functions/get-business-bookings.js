import { createClient } from '@supabase/supabase-js';

// ✅ FIXED: Use your actual Netlify env var name
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Basic auth check
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - Missing auth token' })
    };
  }

  try {
    const { businessId, startDate, endDate, limit = 5000 } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing businessId' })
      };
    }

    // Build query with controlled status filtering
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId)
      .in('status', ['checked_in', 'completed'])
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    // Add optional date filters
    if (startDate) {
      query = query.gte('check_in_date', startDate);
    }
    if (endDate) {
      query = query.lte('check_in_date', endDate);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch bookings' })
      };
    }

    // Calculate summary statistics
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const statusBreakdown = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});
    
    const bookingsByMonth = bookings.reduce((acc, b) => {
      if (b.check_in_date) {
        const date = new Date(b.check_in_date);
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        acc[monthYear] = (acc[monthYear] || 0) + 1;
      }
      return acc;
    }, {});
    
    const guestOrigins = {
      provinces: {},
      cities: {},
      countries: {}
    };
    
    bookings.forEach(b => {
      if (b.guest_province) guestOrigins.provinces[b.guest_province] = (guestOrigins.provinces[b.guest_province] || 0) + 1;
      if (b.guest_city) guestOrigins.cities[b.guest_city] = (guestOrigins.cities[b.guest_city] || 0) + 1;
      if (b.guest_country) guestOrigins.countries[b.guest_country] = (guestOrigins.countries[b.guest_country] || 0) + 1;
    });

    const averageNights = bookings.length > 0
      ? (bookings.reduce((sum, b) => sum + (b.nights || 1), 0) / bookings.length).toFixed(1)
      : 0;

    console.log(`📊 ${bookings.length} bookings returned for business ${businessId}`);

    // ✅ CRITICAL: Include success: true in response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        bookings: bookings || [],
        summary: {
          total_bookings: bookings.length,
          total_revenue: totalRevenue,
          average_nights: averageNights,
          bookings_by_status: statusBreakdown,
          bookings_by_month: bookingsByMonth,
          guest_origins: guestOrigins
        },
        period: {
          start_date: startDate || 'all',
          end_date: endDate || 'all'
        }
      })
    };
  } catch (err) {
    console.error('❌ get-business-bookings error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Internal Server Error'
      })
    };
  }
};
