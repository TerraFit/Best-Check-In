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
    // Auth verification
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

    const { 
      businessId: businessIdFromQuery, 
      startDate, 
      endDate, 
      dateRange,
      futureOnly,
      limit = 10000 
    } = event.queryStringParameters || {};

    const targetBusinessId = businessIdFromQuery || businessIdFromToken;
    
    if (businessIdFromQuery && businessIdFromToken && businessIdFromQuery !== businessIdFromToken) {
      console.error(`❌ Security violation: Token business_id (${businessIdFromToken}) does not match requested (${businessIdFromQuery})`);
      return createResponse(403, { 
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this business data'
      });
    }
    
    if (!targetBusinessId) {
      return createResponse(400, { success: false, error: 'Missing businessId parameter' });
    }

    console.log(`✅ Authenticated request for business: ${targetBusinessId}`);
    console.log(`📊 Date range: ${dateRange}, Custom: ${startDate} - ${endDate}, futureOnly: ${futureOnly}`);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return createResponse(500, { success: false, error: 'Server configuration error' });
    }

    // ✅ FIXED: Use unified bookings table
    const BOOKINGS_TABLE = 'bookings';
    
    // Build URL with filters
    let url = `${supabaseUrl}/rest/v1/${encodeURIComponent(BOOKINGS_TABLE)}?business_id=eq.${targetBusinessId}&select=*&order=check_in_date.desc&limit=${limit}`;

    // Apply futureOnly filter (upcoming bookings only)
    if (futureOnly === 'true') {
      const today = new Date().toISOString().split('T')[0];
      url += `&check_in_date=gte.${today}`;
    }

    // Apply date filters
    if (startDate && endDate) {
      console.log(`📅 Using custom date range: ${startDate} to ${endDate}`);
      url += `&check_in_date=gte.${startDate}&check_in_date=lte.${endDate}`;
    } else if (dateRange === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      url += `&check_in_date=gte.${sevenDaysAgo.toISOString().split('T')[0]}`;
    } else if (dateRange === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      url += `&check_in_date=gte.${thirtyDaysAgo.toISOString().split('T')[0]}`;
    } else if (dateRange === '90days') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      url += `&check_in_date=gte.${ninetyDaysAgo.toISOString().split('T')[0]}`;
    } else if (dateRange === '12months') {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      url += `&check_in_date=gte.${twelveMonthsAgo.toISOString().split('T')[0]}`;
    }

    console.log(`🔗 Fetching URL: ${url}`);

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
    console.log(`✅ Total bookings fetched: ${allBookings.length}`);

    // ============================================================
    // FULL ANALYTICS WITH FIXED STAYOVER CALCULATION
    // ============================================================
    
    const totalRevenue = allBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    
    const statusBreakdown = allBookings.reduce((acc, b) => {
      const status = b.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const bookingsByMonth = allBookings.reduce((acc, b) => {
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
    
    const guestOrigins = {
      provinces: {},
      cities: {},
      countries: {}
    };
    
    allBookings.forEach(b => {
      if (b.guest_province) guestOrigins.provinces[b.guest_province] = (guestOrigins.provinces[b.guest_province] || 0) + 1;
      if (b.guest_city) guestOrigins.cities[b.guest_city] = (guestOrigins.cities[b.guest_city] || 0) + 1;
      if (b.guest_country) guestOrigins.countries[b.guest_country] = (guestOrigins.countries[b.guest_country] || 0) + 1;
    });

    const averageNights = allBookings.length > 0
      ? (allBookings.reduce((sum, b) => sum + (Number(b.nights) || Number(b.num_nights) || 1), 0) / allBookings.length).toFixed(1)
      : 0;

    // ✅ FIXED: Today's activity calculations with proper date handling
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Today's check-ins (arrivals)
    const todayCheckIns = allBookings.filter(b => b.check_in_date === todayStr).length;
    
    // Today's check-outs (departures)
    const todayCheckOuts = allBookings.filter(b => b.check_out_date === todayStr).length;
    
    // ✅ FIXED: Current stayovers (guests who checked in before today and haven't checked out yet)
    const todayStayovers = allBookings.filter(b => {
      if (!b.check_in_date) return false;
      
      const checkInDate = new Date(b.check_in_date);
      checkInDate.setHours(0, 0, 0, 0);
      
      // If check-in is today, it's an arrival, not a stayover
      if (checkInDate.getTime() === today.getTime()) return false;
      
      // If check-in is in the future, not a stayover yet
      if (checkInDate > today) return false;
      
      // If no check-out date, they're still here
      if (!b.check_out_date) return true;
      
      const checkOutDate = new Date(b.check_out_date);
      checkOutDate.setHours(0, 0, 0, 0);
      
      // Stayover if check-out is AFTER today OR equal to today (they haven't left yet)
      return checkOutDate >= today;
    }).length;

    console.log(`📊 Today's Stats - Arrivals: ${todayCheckIns}, Stayovers: ${todayStayovers}, Departures: ${todayCheckOuts}`);

    return createResponse(200, {
      success: true,
      bookings: allBookings,
      summary: {
        total_bookings: allBookings.length,
        total_revenue: totalRevenue,
        average_nights: parseFloat(averageNights),
        bookings_by_status: statusBreakdown,
        bookings_by_month: bookingsByMonth,
        guest_origins: guestOrigins,
        today_activity: {
          arrivals: todayCheckIns,
          stayovers: todayStayovers,
          checkouts: todayCheckOuts
        }
      },
      period: {
        date_range: dateRange || 'custom',
        start_date: startDate || null,
        end_date: endDate || null
      }
    });

  } catch (err) {
    console.error('❌ get-business-bookings error:', err);
    
    if (err.message?.startsWith('UNAUTHORIZED:')) {
      return createResponse(401, { success: false, error: err.message.replace('UNAUTHORIZED: ', '') });
    }
    if (err.message?.startsWith('FORBIDDEN:')) {
      return createResponse(403, { success: false, error: err.message.replace('FORBIDDEN: ', '') });
    }
    
    return createResponse(500, {
      success: false,
      error: 'Internal Server Error',
      message: err.message
    });
  }
};
