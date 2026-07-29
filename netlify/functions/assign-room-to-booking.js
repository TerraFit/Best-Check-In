// netlify/functions/assign-room-to-booking.js
// Allocate or clear room on a booking. Reversible. Writes audit + room_events.

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { bookingId, roomId, businessId } = body;

    if (!bookingId || !businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'bookingId and businessId are required' }),
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
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // Current booking
    const bookingRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=id,business_id,guest_name,room_id,room_number,room_name,check_in_date,check_out_date,nights,status`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!bookingRes.ok) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Booking not found' }) };
    }

    const bookings = await bookingRes.json();
    const booking = bookings[0];
    if (!booking) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Booking not found' }) };
    }

    const previousRoomId = booking.room_id;
    let newRoom = null;

    if (roomId) {
      const roomRes = await fetch(
        `${supabaseUrl}/rest/v1/rooms?id=eq.${roomId}&business_id=eq.${businessId}&active=eq.true&select=*`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json',
          },
        }
      );
      const rooms = roomRes.ok ? await roomRes.json() : [];
      newRoom = rooms[0];
      if (!newRoom) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Room not found or inactive' }),
        };
      }
      if (newRoom.availability_status !== 'available') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Room is not available for allocation' }),
        };
      }
    }

    const updatePayload = {
      room_id: roomId || null,
      room_number: newRoom ? newRoom.room_number : null,
      room_name: newRoom ? newRoom.room_name : null,
      updated_at: new Date().toISOString(),
    };

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: 'PATCH',
      headers: restHeaders,
      body: JSON.stringify(updatePayload),
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return { statusCode: updateRes.status, headers, body: JSON.stringify({ error: err }) };
    }

    const updated = await updateRes.json();
    const updatedBooking = updated[0];

    // Update occupancy on previous room if released
    if (previousRoomId && previousRoomId !== roomId) {
      await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${previousRoomId}`, {
        method: 'PATCH',
        headers: restHeaders,
        body: JSON.stringify({
          occupancy_status: 'vacant',
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => {});

      await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            business_id: businessId,
            room_id: previousRoomId,
            event_type: 'room_released',
            source: 'staff',
            severity: 'info',
            booking_id: bookingId,
            guest_name: booking.guest_name,
            details: { to_room_id: roomId || null },
          },
        ]),
      }).catch(() => {});
    }

    // Update occupancy on new room
    if (newRoom) {
      const today = new Date().toISOString().split('T')[0];
      const checkIn = booking.check_in_date || today;
      const occupancy = checkIn <= today ? 'occupied' : 'reserved';

      await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${newRoom.id}`, {
        method: 'PATCH',
        headers: restHeaders,
        body: JSON.stringify({
          occupancy_status: occupancy,
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => {});

      await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            business_id: businessId,
            room_id: newRoom.id,
            event_type: previousRoomId ? 'room_reassigned' : 'room_allocated',
            source: 'staff',
            severity: 'info',
            booking_id: bookingId,
            guest_name: booking.guest_name,
            details: {
              from_room_id: previousRoomId || null,
              room_number: newRoom.room_number,
              occupancy_status: occupancy,
            },
          },
        ]),
      }).catch(() => {});
    }

    // Audit log
    try {
      await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            business_id: businessId,
            user_id: '00000000-0000-0000-0000-000000000000',
            user_name: 'Staff',
            user_role: 'owner',
            action: roomId ? 'ROOM_ASSIGNED' : 'ROOM_CLEARED',
            details: {
              from_room_id: previousRoomId,
              to_room_id: roomId,
              room_number: newRoom?.room_number ?? null,
              room_name: newRoom?.room_name ?? null,
            },
            description: roomId
              ? `Assigned room ${newRoom.room_number}${newRoom.room_name ? '. ' + newRoom.room_name : ''} to ${booking.guest_name || 'guest'}`
              : `Cleared room assignment for ${booking.guest_name || 'guest'}`,
            booking_id: bookingId,
            guest_name: booking.guest_name || null,
            created_at: new Date().toISOString(),
          },
        ]),
      });
    } catch (e) {
      console.warn('Audit log failed (non-critical):', e.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        booking: updatedBooking,
        room: newRoom,
      }),
    };
  } catch (error) {
    console.error('assign-room-to-booking fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to assign room' }),
    };
  }
};
