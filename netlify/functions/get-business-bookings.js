// netlify/functions/get-business-bookings.js
// ✅ FIXED: Include business_id in response

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

exports.handler = async (event) => {
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
      status,
      startDate, 
      endDate, 
      limit = 25,
      page = 1
    } = event.queryStringParameters || {};

    const targetBusinessId = businessIdFromQuery || businessIdFromToken;
    
    if (businessIdFromQuery && businessIdFromToken && businessIdFromQuery !== businessIdFromToken) {
      return createResponse(403, { success: false, error: 'Forbidden' });
    }
    
    if (!targetBusinessId) {
      return createResponse(400, { success: false, error: 'Missing businessId parameter' });
    }

    console.log(`✅ Fetching bookings for business: ${targetBusinessId}`);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return createResponse(500, { success: false, error: 'Server configuration error' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // ✅ Include business_id in select fields
    const selectFields = [
      'id',
      'business_id',
      'guest_name',
      'guest_first_name',
      'guest_last_name',
      'guest_email',
      'guest_phone',
      'guest_id_number',
      'guest_id_photo',
      'guest_signature',
      'check_in_date',
      'check_out_date',
      'nights',
      'adults',
      'children',
      'total_amount',
      'status',
      'guest_province',
      'guest_city',
      'guest_country',
      'booking_source',
      'referral_source',
      'marketing_consent',
      'arriving_from',
      'next_destination',
      'created_at',
      'updated_at',
      'room_id'
    ].join(',');
    
    let url = `${supabaseUrl}/rest/v1/bookings?business_id=eq.${targetBusinessId}&select=${selectFields}&order=check_in_date.desc&limit=${limit}&offset=${offset}`;
    
    // ✅ Add status filter if provided
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      const statusConditions = statuses.map(s => `status=eq.${s}`).join(',');
      url += `&or=(${statusConditions})`;
    }
    
    if (startDate && endDate) {
      url += `&check_in_date=gte.${startDate}&check_in_date=lte.${endDate}`;
    } else if (startDate && !endDate) {
      url += `&check_in_date=gte.${startDate}`;
    }
    
    console.log(`🔗 URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const bookings = await response.json();
    console.log(`✅ Bookings fetched: ${bookings.length}`);

    // ✅ Get total count
    let countUrl = `${supabaseUrl}/rest/v1/bookings?business_id=eq.${targetBusinessId}&select=id`;
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      const statusConditions = statuses.map(s => `status=eq.${s}`).join(',');
      countUrl += `&or=(${statusConditions})`;
    }
    if (startDate && endDate) {
      countUrl += `&check_in_date=gte.${startDate}&check_in_date=lte.${endDate}`;
    } else if (startDate && !endDate) {
      countUrl += `&check_in_date=gte.${startDate}`;
    }
    
    const countResponse = await fetch(countUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const totalCountData = await countResponse.json();
    const totalBookings = totalCountData.length;
    const totalPages = Math.ceil(totalBookings / parseInt(limit));

    // ✅ Calculate today's activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const todayCheckIns = bookings.filter(b => b.check_in_date === todayStr && b.status === 'checked_in').length;
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
