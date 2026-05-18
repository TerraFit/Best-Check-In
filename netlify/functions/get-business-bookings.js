import jwt from 'jsonwebtoken';

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

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});
  if (event.httpMethod !== 'GET') return createResponse(405, { success: false, error: 'Method Not Allowed' });

  try {
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) return createResponse(401, { success: false, error: 'No authorization token' });

    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    const businessIdFromToken = decoded.user_metadata?.business_id;
    const businessIdFromQuery = event.queryStringParameters?.businessId;
    const targetBusinessId = businessIdFromQuery || businessIdFromToken;

    if (!targetBusinessId) return createResponse(400, { success: false, error: 'Missing businessId' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const { startDate, endDate, dateRange, limit = 10000 } = event.queryStringParameters || {};

    // ⚠️ IMPORTANT: Change this to YOUR actual table name!
    const BOOKINGS_TABLE = 'ONLINE CHECKING J-BAY ZEBRA LODGE';
    
    let url = `${supabaseUrl}/rest/v1/${encodeURIComponent(BOOKINGS_TABLE)}?business_id=eq.${targetBusinessId}&select=*&order=check_in_date.desc&limit=${limit}`;

    // Apply date filters
    if (startDate && endDate) {
      url += `&check_in_date=gte.${startDate}&check_in_date=lte.${endDate}`;
    } else if (dateRange === '7days') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      url += `&check_in_date=gte.${date.toISOString().split('T')[0]}`;
    } else if (dateRange === '30days') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      url += `&check_in_date=gte.${date.toISOString().split('T')[0]}`;
    } else if (dateRange === '90days') {
      const date = new Date();
      date.setDate(date.getDate() - 90);
      url += `&check_in_date=gte.${date.toISOString().split('T')[0]}`;
    } else if (dateRange === '12months') {
      const date = new Date();
      date.setMonth(date.getMonth() - 12);
      url += `&check_in_date=gte.${date.toISOString().split('T')[0]}`;
    }

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const allBookings = await response.json();

    // ============================================================
    // FULL ANALYTICS CALCULATIONS (ALL PRESERVED)
    // ============================================================
    
    const totalRevenue = (allBookings || []).reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    
    const statusBreakdown = (allBookings || []).reduce((acc, b) => {
      const status = b.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const bookingsByMonth = (allBookings || []).reduce((acc, b) => {
      const dateField = b.check_in_date || b.check_in || b.created_at;
      if (dateField) {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) {
          const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
          acc[monthYear] = (acc[monthYear] || 0) + 1;
        }
      }
      return acc;
    }, {});
    
    const guestOrigins = { provinces: {}, cities: {}, countries: {} };
    
    (allBookings || []).forEach(b => {
      if (b.guest_province) guestOrigins.provinces[b.guest_province] = (guestOrigins.provinces[b.guest_province] || 0) + 1;
      if (b.guest_city) guestOrigins.cities[b.guest_city] = (guestOrigins.cities[b.guest_city] || 0) + 1;
      if (b.guest_country) guestOrigins.countries[b.guest_country] = (guestOrigins.countries[b.guest_country] || 0) + 1;
    });

    const averageNights = allBookings?.length > 0
      ? (allBookings.reduce((sum, b) => sum + (Number(b.nights) || Number(b.num_nights) || 1), 0) / allBookings.length).toFixed(1)
      : 0;

    // Referral sources tracking
    const referralCounts = (allBookings || []).reduce((acc, b) => {
      const source = b.booking_source || b.referral_source;
      if (source && source !== 'NULL' && source !== 'null') {
        acc[source] = (acc[source] || 0) + 1;
      }
      return acc;
    }, {});

    const referralData = Object.entries(referralCounts).map(([name, count]) => ({ name, count }));

    // Today's activity
    const today = new Date().toISOString().split('T')[0];
    const todayCheckIns = (allBookings || []).filter(b => b.check_in_date === today).length;
    const todayCheckOuts = (allBookings || []).filter(b => b.check_out_date === today).length;
    const todayStayovers = (allBookings || []).filter(b => 
      b.check_in_date <= today && b.check_out_date > today
    ).length;

    // Occupancy calculation
    const occupancyRate = allBookings?.length > 0 
      ? (todayCheckIns / allBookings.length) * 100 
      : 0;

    return createResponse(200, {
      success: true,
      bookings: allBookings || [],
      summary: {
        total_bookings: allBookings?.length || 0,
        total_revenue: totalRevenue,
        average_nights: parseFloat(averageNights),
        bookings_by_status: statusBreakdown,
        bookings_by_month: bookingsByMonth,
        guest_origins: guestOrigins,
        referral_sources: referralCounts,
        referral_data: referralData,
        today_check_ins: todayCheckIns,
        today_check_outs: todayCheckOuts,
        today_stayovers: todayStayovers,
        occupancy_rate: occupancyRate
      },
      period: {
        date_range: dateRange || 'custom',
        start_date: startDate || null,
        end_date: endDate || null
      }
    });

  } catch (err) {
    console.error('Error:', err);
    if (err.message?.includes('token') || err.name === 'JsonWebTokenError') {
      return createResponse(401, { success: false, error: 'Invalid or expired token' });
    }
    return createResponse(500, { success: false, error: err.message });
  }
};
