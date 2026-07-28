// netlify/functions/get-available-rooms.js
// ✅ FIXED: Date-aware room availability

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
    const { businessId, checkIn, checkOut } = event.queryStringParameters || {};

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
    console.log(`📅 Check-in: ${checkIn}, Check-out: ${checkOut}`);

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

    // ✅ Step 2: Get active bookings (Checked-In or Stayover) with room_id and dates
    // ✅ IMPORTANT: Only bookings that overlap with the requested dates
    let occupiedRoomIds = new Set();
    let occupiedRoomsInfo = {};

    if (checkIn && checkOut) {
      // ✅ Get bookings that overlap with the requested stay period
      // A room is occupied if there's a booking with:
      // - Status = 'Checked-In' or 'Stayover'
      // - AND (check_in_date <= requested_check_out) AND (check_out_date >= requested_check_in)
      const activeStatuses = encodeURIComponent('("Checked-In","Stayover")');
      const bookingsUrl = `${supabaseUrl}/rest/v1/bookings?business_id=eq.${encodeURIComponent(businessId)}&status=in.${activeStatuses}&room_id=not.is.null&select=room_id,guest_name,check_in_date,check_out_date`;
      console.log(`📡 Bookings URL: ${bookingsUrl}`);

      const bookingsResponse = await fetch(bookingsUrl, {
        method: 'GET',
        headers
      });

      if (!bookingsResponse.ok) {
        const errorText = await bookingsResponse.text();
        console.error(`❌ Bookings API error: ${bookingsResponse.status} - ${errorText}`);
        return {
          statusCode: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Unable to verify current room occupancy',
            details: errorText
          })
        };
      }

      const activeBookings = await bookingsResponse.json();

      // ✅ Check for date overlap
      const requestedCheckIn = new Date(checkIn);
      const requestedCheckOut = new Date(checkOut);

      activeBookings.forEach(booking => {
        const bookingCheckIn = new Date(booking.check_in_date);
        const bookingCheckOut = new Date(booking.check_out_date);

        // ✅ Check if booking overlaps with requested dates
        // Overlap if: booking_check_in < requested_check_out AND booking_check_out > requested_check_in
        const overlaps = bookingCheckIn < requestedCheckOut && bookingCheckOut > requestedCheckIn;

        if (overlaps && booking.room_id) {
          occupiedRoomIds.add(booking.room_id);
          occupiedRoomsInfo[booking.room_id] = {
            guest_name: booking.guest_name,
            check_out_date: booking.check_out_date
          };
        }
      });

      console.log(`🔒 ${occupiedRoomIds.size} rooms are occupied during your stay`);
    }

    // ✅ Step 3: Filter available rooms
    const availableRooms = allRooms.filter(room => {
      const isOccupied = occupiedRoomIds.has(room.id);
      const isActive = room.status === 'active';
      return !isOccupied && isActive;
    });

    console.log(`✅ Found ${availableRooms.length} available rooms`);

    // ✅ Add occupancy info for debugging
    const roomsWithInfo = availableRooms.map(room => ({
      ...room,
      is_available: true,
      current_guest: occupiedRoomsInfo[room.id]?.guest_name || null,
      check_out_date: occupiedRoomsInfo[room.id]?.check_out_date || null
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        rooms: roomsWithInfo,
        total_rooms: allRooms.length,
        occupied_count: occupiedRoomIds.size,
        available_count: roomsWithInfo.length,
        businessId: businessId,
        checkIn: checkIn,
        checkOut: checkOut
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
