// netlify/functions/get-available-rooms.js
// ✅ FIXED: Uses 'active' status (matching your database constraint)
// ✅ CORRECT: ES Module syntax with import/export

export const handler = async (event) => {
  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { businessId } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Business ID is required'
        })
      };
    }

    console.log(`📡 Fetching available rooms for business: ${businessId}`);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Server configuration error'
        })
      };
    }

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // ✅ Step 1: Get all rooms for this business
    const roomsUrl = `${supabaseUrl}/rest/v1/rooms?business_id=eq.${encodeURIComponent(businessId)}&order=room_number.asc`;
    console.log(`📡 Rooms URL: ${roomsUrl}`);

    const roomsResponse = await fetch(roomsUrl, {
      method: 'GET',
      headers
    });

    if (!roomsResponse.ok) {
      const errorText = await roomsResponse.text();
      console.error(`❌ Rooms API error: ${roomsResponse.status} - ${errorText}`);
      return {
        statusCode: roomsResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: `Rooms API error: ${roomsResponse.status}`,
          details: errorText
        })
      };
    }

    const allRooms = await roomsResponse.json();
    console.log(`📡 Found ${allRooms.length} total rooms`);

    // ✅ Step 2: Get active bookings (Checked-In or Stayover) with room_id
    const activeStatuses = encodeURIComponent('("Checked-In","Stayover")');
    const bookingsUrl = `${supabaseUrl}/rest/v1/bookings?business_id=eq.${encodeURIComponent(businessId)}&status=in.${activeStatuses}&room_id=not.is.null&select=room_id`;
    console.log(`📡 Bookings URL: ${bookingsUrl}`);

    const bookingsResponse = await fetch(bookingsUrl, {
      method: 'GET',
      headers
    });

    let occupiedRoomIds = new Set();

    if (bookingsResponse.ok) {
      const activeBookings = await bookingsResponse.json();
      occupiedRoomIds = new Set(
        (activeBookings || []).map(b => b.room_id).filter(id => id !== null)
      );
      console.log(`🔒 ${occupiedRoomIds.size} rooms are occupied`);
    } else {
      console.warn(`⚠️ Could not fetch active bookings: ${bookingsResponse.status}`);
    }

    // ✅ Step 3: Filter available rooms
    // Check for 'active' status (matching your database constraint)
    const availableRooms = allRooms.filter(room => {
      const isOccupied = occupiedRoomIds.has(room.id);
      const isActive = room.status === 'active';
      return !isOccupied && isActive;
    });

    console.log(`✅ Found ${availableRooms.length} available rooms`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        rooms: availableRooms,
        total_rooms: allRooms.length,
        occupied_count: occupiedRoomIds.size,
        available_count: availableRooms.length,
        businessId: businessId
      })
    };

  } catch (error) {
    console.error('❌ Unhandled error in get-available-rooms:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        stack: error.stack
      })
    };
  }
};
