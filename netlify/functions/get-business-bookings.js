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

    // Get query parameters
    const { 
      businessId: businessIdFromQuery, 
      startDate, 
      endDate, 
      limit = 25,
      page = 1
    } = event.queryStringParameters || {};

    const targetBusinessId = businessIdFromQuery || businessIdFromToken;
    
    // Security check
    if (businessIdFromQuery && businessIdFromToken && businessIdFromQuery !== businessIdFromToken) {
      console.error(`❌ Security violation - business ID mismatch`);
      return createResponse(403, { success: false, error: 'Forbidden' });
    }
    
    if (!targetBusinessId) {
      return createResponse(400, { success: false, error: 'Missing businessId parameter' });
    }

    console.log(`✅ Authenticated request for business: ${targetBusinessId}`);
    console.log(`📊 Limit: ${limit}, Page: ${page}`);
    console.log(`📅 StartDate: ${startDate}, EndDate: ${endDate}`);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return createResponse(500, { success: false, error: 'Server configuration error' });
    }

    const BOOKINGS_TABLE = 'bookings';
    
    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Select fields (exclude large base64 fields)
    const selectFields = 'id,business_id,guest_name,guest_first_name,guest_last_name,guest_email,guest_phone,guest_id_number,check_in_date,check_out_date,nights,adults,children,total_amount,status,guest_province,guest_city,guest_country,booking_source,referral_source,marketing_consent,created_at,updated_at';
    
    // Build the base URL
    let url = `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?business_id=eq.${targetBusinessId}&select=${selectFields}&order=check_in_date.desc&limit=${limit}&offset=${offset}`;
    
    // CRITICAL FIX: Apply date filters correctly
    if (startDate && endDate) {
      // Both start and end dates provided (custom range)
      url += `&check_in_date=gte.${startDate}&check_in_date=lte.${endDate}`;
      console.log(`📅 Custom date range: ${startDate} to ${endDate}`);
    } else if (startDate && !endDate) {
      // Only start date provided (preset like "Last 7 days", "Last 30 days", etc.)
      // Use gte (greater than or equal to) for start date
      url += `&check_in_date=gte.${startDate}`;
      console.log(`📅 Start date filter: check_in_date >= ${startDate}`);
    } else {
      console.log(`📅 No date filters applied - showing all bookings`);
    }
    
    console.log(`🔗 FINAL SUPABASE URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const bookings = await response.json();
    console.log(`✅ Bookings fetched: ${bookings.length}`);

    // Get total count for pagination (respecting date filters)
    let countUrl = `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?business_id=eq.${targetBusinessId}&select=id`;
    
    // Apply SAME date filters to count query
    if (startDate && endDate) {
      countUrl += `&check_in_date=gte.${startDate}&check_in_date=lte.${endDate}`;
    } else if (startDate && !endDate) {
      countUrl += `&check_in_date=gte.${startDate}`;
    }
    
    console.log(`🔗 Count URL: ${countUrl}`);
    
    const countResponse = await fetch(countUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const totalCountData = await countResponse.json();
    const totalBookings = totalCountData.length;
    const totalPages = Math.ceil(totalBookings / parseInt(limit));

    console.log(`📊 Total bookings matching filter: ${totalBookings}, Total pages: ${totalPages}`);

    // DEBUG: Log first few bookings to verify date filtering
    if (bookings.length > 0) {
      console.log(`🔍 Sample booking dates:`, bookings.slice(0, 5).map(b => b.check_in_date));
    }

    // Calculate today's activity (for dashboard overview)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const todayCheckIns = bookings.filter(b => b.check_in_date === todayStr).length;
    const todayCheckOuts = bookings.filter(b => b.check_out_date === todayStr).length;
    
    const todayStayovers = bookings.filter(b => {
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

    console.log(`📊 Today's Stats - Arrivals: ${todayCheckIns}, Stayovers: ${todayStayovers}, Departures: ${todayCheckOuts}`);

    return createResponse(200, {
      success: true,
      bookings: bookings,
      total_count: totalBookings,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: totalPages,
      today_activity: {
        arrivals: todayCheckIns,
        stayovers: todayStayovers,
        checkouts: todayCheckOuts
      }
    });

  } catch (err) {
    console.error('❌ get-business-bookings error:', err);
    return createResponse(500, {
      success: false,
      error: 'Internal Server Error',
      message: err.message
    });
  }
};
