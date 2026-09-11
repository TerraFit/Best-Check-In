// netlify/functions/get-available-rooms.js
// Conflict-prevention: only rooms that are active, available, and free for the stay

import auth from './_auth.cjs';

const {
  authenticateRequest,
  requireBusinessPermission,
  requirePlatformPermission,
  resolveTenant,
  authFailure,
} = auth;

export const handler = async (event) => {
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

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);
  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) {
      return authFailure({ status: 403, error: 'Missing permission: platform:businesses:read' }, headers);
    }
  } else if (!requireBusinessPermission(principal, 'canViewRooms')) {
    return authFailure({ status: 403, error: 'Missing permission: canViewRooms' }, headers);
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

    const scope = resolveTenant(principal, businessId);
    if (!scope.ok) return authFailure(scope, headers);
    const authoritativeBusinessId = scope.businessId;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Available rooms configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const restHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    };

    const roomsRes = await fetch(
      `${supabaseUrl}/rest/v1/rooms?business_id=eq.${encodeURIComponent(authoritativeBusinessId)}&active=eq.true&availability_status=eq.available&order=sort_order.asc.nullslast,room_number.asc`,
      { headers: restHeaders }
    );

    if (!roomsRes.ok) {
      console.error('Available rooms lookup failed:', roomsRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch available rooms' }) };
    }

    const allRooms = await roomsRes.json();
    if (!allRooms.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, rooms: [] }) };
    }

    const bookingsRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?business_id=eq.${encodeURIComponent(authoritativeBusinessId)}&room_id=not.is.null&status=neq.cancelled&select=id,room_id,check_in_date,check_out_date,nights,status`,
      { headers: restHeaders }
    );

    if (!bookingsRes.ok) {
      console.error('Available rooms occupancy lookup failed:', bookingsRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to verify room availability' }) };
    }

    const occupiedRoomIds = new Set();
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

      if (bIn < reqOut && bOut > reqIn) occupiedRoomIds.add(b.room_id);
    }

    const available = allRooms.filter((r) => !occupiedRoomIds.has(r.id));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, rooms: available }),
    };
  } catch (error) {
    console.error('get-available-rooms fatal:', error?.message || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch available rooms' }),
    };
  }
};
