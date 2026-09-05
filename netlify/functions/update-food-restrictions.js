// netlify/functions/update-food-restrictions.js
// Authoritative tenant-scoped food restriction write.

import auth from './_auth.cjs';

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const response = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const encode = (value) => encodeURIComponent(String(value));

async function supabaseRequest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers);
  if (!requireBusinessPermission(actor.principal, 'canManageBookings')) {
    return authFailure({ status: 403, error: 'Missing permission: canManageBookings' }, headers);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { bookingId, restrictions } = body;
    if (!bookingId || typeof bookingId !== 'string' || bookingId.length > 200) return response(400, { error: 'Booking ID required' });
    if (!restrictions || typeof restrictions !== 'object' || Array.isArray(restrictions)) return response(400, { error: 'Restrictions data required' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return response(500, { error: 'Server configuration error' });

    const bookingResponse = await supabaseRequest(`bookings?id=eq.${encode(bookingId)}&select=id,business_id&limit=1`);
    if (!bookingResponse.ok) {
      console.error('Food restriction booking lookup failed:', bookingResponse.status);
      return response(500, { error: 'Failed to validate booking' });
    }
    const bookings = await bookingResponse.json();
    const booking = Array.isArray(bookings) ? bookings[0] : null;
    if (!booking) return response(404, { error: 'Booking not found' });

    const scope = resolveTenant(actor.principal, booking.business_id);
    if (!scope.ok) return authFailure(scope, headers);

    const restrictionData = { ...restrictions, updated_at: new Date().toISOString() };
    const existingResponse = await supabaseRequest(`booking_food_restrictions?booking_id=eq.${encode(bookingId)}&select=id&limit=1`);
    if (!existingResponse.ok) {
      console.error('Food restriction existence check failed:', existingResponse.status);
      return response(500, { error: 'Failed to read food restrictions' });
    }
    const existingRows = await existingResponse.json();
    const existingId = Array.isArray(existingRows) ? existingRows[0]?.id : null;

    let result;
    if (existingId) {
      const updateResponse = await supabaseRequest(`booking_food_restrictions?id=eq.${encode(existingId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(restrictionData)
      });
      if (!updateResponse.ok) {
        console.error('Food restriction update failed:', updateResponse.status);
        return response(500, { error: 'Failed to update food restrictions' });
      }
      const data = await updateResponse.json();
      result = Array.isArray(data) ? data[0] : null;
    } else {
      const insertResponse = await supabaseRequest('booking_food_restrictions', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify([{ booking_id: bookingId, ...restrictionData }])
      });
      if (!insertResponse.ok) {
        console.error('Food restriction insert failed:', insertResponse.status);
        return response(500, { error: 'Failed to update food restrictions' });
      }
      const data = await insertResponse.json();
      result = Array.isArray(data) ? data[0] : null;
    }

    return response(200, { success: true, restrictions: result });
  } catch (error) {
    console.error('Error updating food restrictions:', error?.message || error);
    if (error instanceof SyntaxError) return response(400, { error: 'Invalid JSON in request body' });
    return response(500, { error: 'Internal server error' });
  }
};
