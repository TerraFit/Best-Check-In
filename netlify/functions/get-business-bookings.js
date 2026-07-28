// netlify/functions/get-business-bookings.js
// ✅ FIXED: Proper room data fetching without nested select issues

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

    // Get query parameters
    const { 
      businessId: businessIdFromQuery, 
      startDate, 
      endDate, 
      limit = 25,
      page = 1
    } = event.queryStringParameters || {};

    const targetBusinessId = businessIdFromQuery || businessIdFromToken;
    
    if (businessIdFromQuery && businessIdFromToken && businessIdFromQuery !== businessIdFromToken) {
      console.error(`❌ Security violation - business ID mismatch`);
      return createResponse(403, { success: false, error: 'Forbidden' });
    }
    
    if (!targetBusinessId) {
      return createResponse(400, { success: false, error: 'Missing businessId parameter' });
    }

    console.log(`✅ Authenticated request for business: ${targetBusinessId}`);
    console.log(`📊 Limit: ${limit}, Page: ${page}`);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return createResponse(500, { success: false, error: 'Server configuration error' });
    }

    const BOOKINGS_TABLE = 'bookings';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // ✅ SIMPLIFIED: Fetch bookings WITHOUT nested rooms select
    const selectFields = `
      id,business_id,guest_name,guest_first_name,guest_last_name,
      guest_email,guest_phone,guest_id_number,guest_id_photo,guest_signature,
      check_in_date,check_out_date,nights,adults,children,total_amount,
      status,guest_province,guest_city,guest_country,
      booking_source,referral_source,marketing_consent,
      arriving_from,next_destination,created_at,updated_at,
      room_id
    `;
    
    let url = `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?business_id=eq.${targetBusinessId}&select=${selectFields}&order=check_in_date.desc&limit=${limit}&offset=${offset}`;
    
    if (startDate && endDate) {
      url += `&check_in_date=gte.${startDate}&check_in_date=lte.${endDate}`;
    } else if (startDate && !endDate) {
      url += `&check_in_date=gte.${startDate}`;
    }
    
    console.log(`🔗 Fetching bookings: ${url}`);

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

    let bookings = await response.json();
    console.log(`✅ Bookings fetched: ${bookings.length}`);

    // ✅ Fetch room data separately for each booking that has a room_id
    if (bookings.length > 0) {
      const bookingIdsWithRooms = bookings.filter(b => b.room_id).map(b => b.room_id);
      
      if (bookingIdsWithRooms.length > 0) {
        console.log(`🔍 Fetching room data for ${bookingIdsWithRooms.length} rooms...`);
        
        try {
          // Fetch all rooms in one query
          const roomIds = bookingIdsWithRooms.join(',');
          const roomUrl = `${supabaseUrl}/rest/v1/rooms?id=in.(${roomIds})&select=id,room_number,room_name,room_type,floor,status`;
          
          const roomResponse = await fetch(roomUrl, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });

          if (roomResponse.ok) {
            const rooms = await roomResponse.json();
            console.log(`✅ Room data fetched: ${rooms.length} rooms`);
            
            // Create a map of room_id -> room data
            const roomMap = {};
            rooms.forEach(room => {
              roomMap[room.id] = room;
            });
            
            // Attach room data to each booking
            bookings = bookings.map(booking => {
              const roomData = roomMap[booking.room_id] || {};
              return {
                ...booking,
                room_number: roomData.room_number || null,
                room_name: roomData.room_name || null,
                room_type: roomData.room_type || null,
                floor: roomData.floor || null,
                room_status: roomData.status || null
              };
            });
          } else {
            console.warn('⚠️ Could not fetch room data');
          }
        } catch (err) {
          console.warn('⚠️ Error fetching room data:', err.message);
        }
      }
    }

    // ============================================================
    // ✅ Fetch food restrictions
    // ============================================================
    if (bookings.length > 0) {
      console.log(`🔍 Fetching food restrictions for ${bookings.length} bookings...`);
      
      try {
        const bookingIds = bookings.map(b => b.id).join(',');
        const restrictionsUrl = `${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=in.(${bookingIds})&select=*`;
        
        const restrictionsResponse = await fetch(restrictionsUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (restrictionsResponse.ok) {
          const allRestrictions = await restrictionsResponse.json();
          console.log(`✅ Total food restrictions in DB: ${allRestrictions.length}`);
          
          // Create a map of booking_id -> restrictions
          const restrictionsMap = {};
          allRestrictions.forEach(r => {
            restrictionsMap[r.booking_id] = r;
          });
          
          // Attach food_restrictions to each booking
          bookings = bookings.map(booking => ({
            ...booking,
            food_restrictions: restrictionsMap[booking.id] || null
          }));
        } else {
          console.warn('⚠️ Could not fetch food restrictions');
          bookings = bookings.map(booking => ({
            ...booking,
            food_restrictions: null
          }));
        }
      } catch (err) {
        console.error('❌ Error fetching food restrictions:', err.message);
        bookings = bookings.map(booking => ({
          ...booking,
          food_restrictions: null
        }));
      }
    }

    // Get total count for pagination
    let countUrl = `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?business_id=eq.${targetBusinessId}&select=id`;
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

    // Calculate today's activity
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
      message: err.message,
      stack: err.stack
    });
  }
};
