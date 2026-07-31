// netlify/functions/get-available-rooms.js
// Conflict-prevention: only rooms that are active, available, and free for the stay

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { businessId, checkIn, checkOut, excludeBookingId } = event.queryStringParameters || {};

    if (!businessId || !checkIn || !checkOut) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId, checkIn, and checkOut are required' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const restHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    };

    // 1. Candidate rooms: active = true AND availability_status = available
    const roomsRes = await fetch(
      `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&active=eq.true&availability_status=eq.available&order=sort_order.asc.nullslast,room_number.asc`,
      { headers: restHeaders }
    );

    if (!roomsRes.ok) {
      const err = await roomsRes.text();
      return { statusCode: roomsRes.status, headers, body: JSON.stringify({ error: err }) };
    }

    const allRooms = await roomsRes.json();
    if (!allRooms.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, rooms: [] }) };
    }

    // 2. Bookings that overlap the requested stay and have a room assigned
    // Overlap: existing.check_in < requested.checkOut AND existing.check_out > requested.checkIn
    // If check_out is null, treat as check_in + nights (fallback: still overlapping if check_in < checkOut)
    const bookingsRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?business_id=eq.${businessId}&room_id=not.is.null&status=neq.cancelled&select=id,room_id,check_in_date,check_out_date,nights,status`,
      { headers: restHeaders }
    );

    let occupiedRoomIds = new Set();
    if (bookingsRes.ok) {
      const bookings = await bookingsRes.json();
      const reqIn = new Date(checkIn);
      const reqOut = new Date(checkOut);

      for (const b of bookings) {
        if (excludeBookingId && b.id === excludeBookingId) continue;
        if (!b.room_id || !b.check_in_date) continue;

        const bIn = new Date(b.check_in_date);
        let bOut;
        if (b.check_out_date) {
          bOut = new Date(b.check_out_date);
        } else {
          bOut = new Date(bIn);
          bOut.setDate(bOut.getDate() + (parseInt(b.nights, 10) || 1));
        }

        // Standard half-open style overlap on calendar dates
        if (bIn < reqOut && bOut > reqIn) {
          occupiedRoomIds.add(b.room_id);
        }
      }
    }

    const available = allRooms.filter((r) => !occupiedRoomIds.has(r.id));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, rooms: available }),
    };
  } catch (error) {
    console.error('get-available-rooms fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to fetch available rooms' }),
    };
  }
};
