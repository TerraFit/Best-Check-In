// netlify/functions/resolve-lost-found-guest.js
// Auto-populate guest details from room / active booking

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
    const q = event.queryStringParameters || {};
    const { businessId, roomId, roomNumber } = q;
    if (!businessId || (!roomId && !roomNumber)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId and roomId or roomNumber required' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const sh = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };

    let room = null;
    if (roomId) {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/rooms?id=eq.${roomId}&business_id=eq.${businessId}&select=id,room_number,name,room_name`,
        { headers: sh }
      );
      const rows = r.ok ? await r.json() : [];
      room = rows[0] || null;
    } else if (roomNumber) {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&room_number=eq.${encodeURIComponent(roomNumber)}&select=id,room_number,name,room_name`,
        { headers: sh }
      );
      const rows = r.ok ? await r.json() : [];
      room = rows[0] || null;
    }

    // Find active / recent booking for this room
    let bookingFilter = `business_id=eq.${businessId}`;
    if (room && room.id) {
      bookingFilter += `&room_id=eq.${room.id}`;
    }
    bookingFilter += `&status=in.(checked_in,confirmed,completed)`;

    const bRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?${bookingFilter}&select=id,guest_name,guest_email,guest_phone,check_in_date,check_out_date,booking_reference,reference,room_id,room_number,status&order=check_in_date.desc&limit=5`,
      { headers: sh }
    );
    const bookings = bRes.ok ? await bRes.json() : [];

    // Prefer currently checked-in, else most recent
    const preferred =
      bookings.find((b) => b.status === 'checked_in') ||
      bookings[0] ||
      null;

    if (!preferred && !room) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, guest: null }),
      };
    }

    const guest = {
      guest_name: preferred?.guest_name || null,
      guest_email: preferred?.guest_email || null,
      guest_phone: preferred?.guest_phone || null,
      booking_id: preferred?.id || null,
      booking_reference:
        preferred?.booking_reference || preferred?.reference || null,
      check_in_date: preferred?.check_in_date || null,
      check_out_date: preferred?.check_out_date || null,
      room_id: room?.id || preferred?.room_id || null,
      room_number:
        room?.room_number != null
          ? String(room.room_number)
          : preferred?.room_number != null
            ? String(preferred.room_number)
            : roomNumber || null,
      room_name: room?.name || room?.room_name || null,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, guest }),
    };
  } catch (error) {
    console.error('resolve-lost-found-guest fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to resolve guest' }),
    };
  }
};
