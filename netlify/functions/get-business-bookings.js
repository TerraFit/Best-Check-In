// netlify/functions/get-business-bookings.js
// ✅ FIXED: Better error handling for food restrictions
// ✅ ADDED: Room information (room_number, room_name, room_type) to bookings response

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
    
    // ✅ ADDED: room fields to select - room_number, room_name, room_type
    const selectFields = `
      id,business_id,guest_name,guest_first_name,guest_last_name,
      guest_email,guest_phone,guest_id_number,guest_id_photo,guest_signature,
      check_in_date,check_out_date,nights,adults,children,total_amount,
      status,guest_province,guest_city,guest_country,
      booking_source,referral_source,marketing_consent,
      arriving_from,next_destination,created_at,updated_at,
      room_id,
      rooms:room_id (
        room_number,
        room_name,
        room_type,
        floor,
        status
      )
    `;
    
    // ✅ MODIFIED: Include room data via nested select
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

    // ✅ Process bookings to flatten room data
    bookings = bookings.map(booking => {
      const roomData = booking.rooms || {};
      return {
        ...booking,
        room_number: roomData.room_number || null,
        room_name: roomData.room_name || null,
        room_type: roomData.room_type || null,
        floor: roomData.floor || null,
        room_status: roomData.status || null,
        rooms: undefined // Remove nested rooms object
      };
    });

    // ============================================================
    // ✅ SIMPLIFIED: Fetch food restrictions - no 'in' query issues
    // ============================================================
    if (bookings.length > 0) {
      console.log(`🔍 Fetching food restrictions for ${bookings.length} bookings...`);
      
      try {
        // First, check if the table exists by trying a simple query
        const testResponse = await fetch(
          `${supabaseUrl}/rest/v1/booking_food_restrictions?limit=1`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        );

        if (!testResponse.ok) {
          console.warn('⚠️ booking_food_restrictions table not found or inaccessible');
          bookings.forEach(booking => {
            booking.food_restrictions = null;
          });
        } else {
          // Table exists - fetch all restrictions and filter in JavaScript
          const restrictionsResponse = await fetch(
            `${supabaseUrl}/rest/v1/booking_food_restrictions?select=*`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }
          );

          if (restrictionsResponse.ok) {
            const allRestrictions = await restrictionsResponse.json();
            console.log(`✅ Total food restrictions in DB: ${allRestrictions.length}`);
            
            // Create a set of booking IDs for O(1) lookup
            const bookingIdSet = new Set(bookings.map(b => b.id));
            
            // Filter restrictions to only those matching our bookings
            const matchingRestrictions = allRestrictions.filter(r => bookingIdSet.has(r.booking_id));
            console.log(`✅ Matching food restrictions: ${matchingRestrictions.length}`);
            
            // Create a map of booking_id -> restrictions
            const restrictionsMap = {};
            matchingRestrictions.forEach(r => {
              restrictionsMap[r.booking_id] = r;
            });
            
            // Attach food_restrictions to each booking
            bookings.forEach(booking => {
              booking.food_restrictions = restrictionsMap[booking.id] || null;
              if (booking.food_restrictions) {
                const activeRestrictions = [];
                if (booking.food_restrictions.vegetarian) activeRestrictions.push('Vegetarian');
                if (booking.food_restrictions.vegan) activeRestrictions.push('Vegan');
                if (booking.food_restrictions.pescatarian) activeRestrictions.push('Pescatarian');
                if (booking.food_restrictions.halal) activeRestrictions.push('Halal');
                if (booking.food_restrictions.kosher) activeRestrictions.push('Kosher');
                if (booking.food_restrictions.gluten_free) activeRestrictions.push('Gluten-Free');
                if (booking.food_restrictions.lactose_free) activeRestrictions.push('Lactose-Free');
                if (booking.food_restrictions.nut_allergy) activeRestrictions.push('Nut Allergy');
                if (booking.food_restrictions.seafood_allergy) activeRestrictions.push('Seafood Allergy');
                if (booking.food_restrictions.diabetic) activeRestrictions.push('Diabetic');
                if (booking.food_restrictions.no_pork) activeRestrictions.push('No Pork');
                if (booking.food_restrictions.other && booking.food_restrictions.other_text) {
                  activeRestrictions.push(booking.food_restrictions.other_text);
                } else if (booking.food_restrictions.other) {
                  activeRestrictions.push('Other');
                }
                console.log(`🍽️ ${booking.guest_name}: ${activeRestrictions.join(', ') || 'None'}`);
              }
            });
          } else {
            console.warn('⚠️ Could not fetch food restrictions');
            bookings.forEach(booking => {
              booking.food_restrictions = null;
            });
          }
        }
      } catch (err) {
        console.error('❌ Error fetching food restrictions:', err.message);
        bookings.forEach(booking => {
          booking.food_restrictions = null;
        });
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
      message: err.message
    });
  }
};
