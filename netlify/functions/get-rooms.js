// netlify/functions/get-rooms.js
// List rooms + derive live occupancy from bookings (never trust stale occupancy_status alone)
// Auth: Bearer JWT required; businessId must match token business_id (tenant isolation)


import auth from './_auth.cjs';

const {
  requireBusinessActor,
  requireBusinessPermission,
  resolveTenant,
  authFailure,
} = auth;

function todayInJohannesburg() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isCancelled(status) {
  const s = String(status || '').toLowerCase();
  return ['cancelled', 'canceled', 'no_show'].includes(s);
}

function deriveOccupancy(room, bookings, todayStr) {
  let hasOccupied = false;
  let hasDeparture = false;
  let hasArrival = false;
  let hasReserved = false;

  for (const b of bookings) {
    if (isCancelled(b.status)) continue;
    const matchId = b.room_id && b.room_id === room.id;
    const matchNum =
      b.room_number !== null &&
      b.room_number !== undefined &&
      b.room_number !== '' &&
      Number(b.room_number) === Number(room.room_number);
    if (!matchId && !matchNum) continue;

    const checkIn = String(b.check_in_date || '').slice(0, 10);
    const checkOut = String(b.check_out_date || '').slice(0, 10);
    if (!checkIn || !checkOut) continue;
    if (checkOut < todayStr) continue;

    if (checkIn < todayStr && todayStr < checkOut) hasOccupied = true;
    else if (todayStr === checkOut) hasDeparture = true;
    else if (todayStr === checkIn) hasArrival = true;
    else if (checkIn > todayStr) hasReserved = true;
  }

  if (hasOccupied) return 'occupied';
  if (hasDeparture) return 'departure_pending';
  if (hasArrival) return 'reserved';
  if (hasReserved) return 'reserved';
  return 'vacant';
}

function deriveOccupancyLabel(room, bookings, todayStr) {
  let hasOccupied = false;
  let hasDeparture = false;
  let hasArrival = false;
  let hasReserved = false;

  for (const b of bookings) {
    if (isCancelled(b.status)) continue;
    const matchId = b.room_id && b.room_id === room.id;
    const matchNum =
      b.room_number !== null &&
      b.room_number !== undefined &&
      b.room_number !== '' &&
      Number(b.room_number) === Number(room.room_number);
    if (!matchId && !matchNum) continue;

    const checkIn = String(b.check_in_date || '').slice(0, 10);
    const checkOut = String(b.check_out_date || '').slice(0, 10);
    if (!checkIn || !checkOut) continue;
    if (checkOut < todayStr) continue;

    if (checkIn < todayStr && todayStr < checkOut) hasOccupied = true;
    else if (todayStr === checkOut) hasDeparture = true;
    else if (todayStr === checkIn) hasArrival = true;
    else if (checkIn > todayStr) hasReserved = true;
  }

  if (hasOccupied) return 'occupied';
  if (hasDeparture) return 'departure_today';
  if (hasArrival) return 'arrival_today';
  if (hasReserved) return 'reserved';
  return 'vacant';
}

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

  try {
    const actor = requireBusinessActor(event);
    if (!actor.ok) return authFailure(actor, headers);

    if (!requireBusinessPermission(actor.principal, 'canViewRooms')) {
      return authFailure(
        { status: 403, error: 'Missing permission: canViewRooms' },
        headers
      );
    }

    const { businessId: qBusinessId, includeInactive } =
      event.queryStringParameters || {};

    const tenant = resolveTenant(actor.principal, qBusinessId);
    if (!tenant.ok) return authFailure(tenant, headers);

    const businessId = tenant.businessId;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const restGet = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    };

    const encodedBusinessId = encodeURIComponent(businessId);

    let path = `rooms?business_id=eq.${encodedBusinessId}&order=sort_order.asc.nullslast,room_number.asc`;
    if (includeInactive !== 'true') {
      path += '&active=eq.true';
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers: restGet });

    if (!response.ok) {
      const err = await response.text();
      console.error('get-rooms error:', err);
      return { statusCode: response.status, headers, body: JSON.stringify({ error: err }) };
    }

    const rooms = await response.json();
    const todayStr = todayInJohannesburg();

    let bookings = [];
    try {
      const bRes = await fetch(
        `${supabaseUrl}/rest/v1/bookings?business_id=eq.${encodedBusinessId}&or=(room_id.not.is.null,room_number.not.is.null)&select=id,room_id,room_number,check_in_date,check_out_date,status`,
        { headers: restGet }
      );
      if (bRes.ok) bookings = await bRes.json();
    } catch (e) {
      console.warn('get-rooms bookings load', e.message);
    }

    const enriched = rooms.map((room) => {
      const derivedLabel = deriveOccupancyLabel(room, bookings, todayStr);
      const storedOccupancy = deriveOccupancy(room, bookings, todayStr);
      return {
        ...room,
        occupancy_status: storedOccupancy,
        derived_occupancy: derivedLabel,
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, rooms: enriched, today: todayStr }),
    };
  } catch (error) {
    console.error('get-rooms fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to fetch rooms' }),
    };
  }
};
