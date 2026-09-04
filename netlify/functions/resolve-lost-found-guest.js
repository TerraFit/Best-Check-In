// Resolve guest details from a tenant-bound room/booking lookup.
import auth from './_auth.cjs';
const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers);
  if (!requireBusinessPermission(actor.principal, 'canViewLostFound')) {
    return authFailure({ status: 403, error: 'Missing permission: canViewLostFound' }, headers);
  }

  try {
    const q = event.queryStringParameters || {};
    const tenant = resolveTenant(actor.principal, q.businessId);
    if (!tenant.ok) return authFailure(tenant, headers);
    if (!q.roomId && !q.roomNumber) return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId and roomId or roomNumber required' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    const sh = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };

    let room = null;
    let roomResponseOk = true;
    if (q.roomId) {
      const r = await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(q.roomId)}&business_id=eq.${encodeURIComponent(tenant.businessId)}&select=id,room_number,name,room_name`, { headers: sh });
      roomResponseOk = r.ok;
      room = r.ok ? (await r.json())[0] || null : null;
    } else {
      const r = await fetch(`${supabaseUrl}/rest/v1/rooms?business_id=eq.${encodeURIComponent(tenant.businessId)}&room_number=eq.${encodeURIComponent(q.roomNumber)}&select=id,room_number,name,room_name`, { headers: sh });
      roomResponseOk = r.ok;
      room = r.ok ? (await r.json())[0] || null : null;
    }

    // Never fall back to a tenant-wide booking search when the requested room
    // was supplied but cannot be resolved. That could disclose an unrelated guest.
    if (!roomResponseOk) {
      console.error('resolve-lost-found-guest room lookup failed');
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Failed to resolve room' }) };
    }
    if (!room) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Room not found' }) };

    const bookingFilter = `business_id=eq.${encodeURIComponent(tenant.businessId)}&room_id=eq.${encodeURIComponent(room.id)}&status=in.(checked_in,confirmed,completed)`;
    const bRes = await fetch(`${supabaseUrl}/rest/v1/bookings?${bookingFilter}&select=id,guest_name,guest_email,guest_phone,check_in_date,check_out_date,booking_reference,reference,room_id,room_number,status&order=check_in_date.desc&limit=5`, { headers: sh });
    if (!bRes.ok) {
      console.error('resolve-lost-found-guest booking lookup failed:', bRes.status);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Failed to resolve guest' }) };
    }
    const bookings = await bRes.json();
    const preferred = bookings.find((b) => b.status === 'checked_in') || bookings[0] || null;

    const guest = {
      guest_name: preferred?.guest_name || null,
      guest_email: preferred?.guest_email || null,
      guest_phone: preferred?.guest_phone || null,
      booking_id: preferred?.id || null,
      booking_reference: preferred?.booking_reference || preferred?.reference || null,
      check_in_date: preferred?.check_in_date || null,
      check_out_date: preferred?.check_out_date || null,
      room_id: room.id,
      room_number: room.room_number != null ? String(room.room_number) : null,
      room_name: room.name || room.room_name || null,
    };

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, guest }) };
  } catch (error) {
    console.error('resolve-lost-found-guest fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to resolve guest' }) };
  }
};
