// netlify/functions/get-guest-details.js
// Guest details are sensitive tenant-scoped data and require authoritative server authorization.

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = require('./_auth.cjs');

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    const { bookingId, businessId: requestedBusinessId } = event.queryStringParameters || {};
    if (!bookingId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Booking ID required' }) };
    const auth = requireBusinessActor(event);
    if (!auth.ok) return authFailure(auth, headers);
    if (!requireBusinessPermission(auth.principal, 'canViewGuestDetails')) return authFailure({ status: 403, error: 'Missing permission: canViewGuestDetails' }, headers);
    const scope = resolveTenant(auth.principal, requestedBusinessId || null);
    if (!scope.ok) return authFailure(scope, headers);
    const businessId = scope.businessId;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    const encodedBookingId = encodeURIComponent(String(bookingId));
    const encodedBusinessId = encodeURIComponent(String(businessId));
    const restHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' };
    const bookingResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${encodedBookingId}&business_id=eq.${encodedBusinessId}&select=*`, { headers: restHeaders });
    if (!bookingResponse.ok) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Booking not found' }) };
    const bookingData = await bookingResponse.json();
    const booking = Array.isArray(bookingData) ? bookingData[0] : null;
    if (!booking || String(booking.business_id) !== String(businessId)) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Booking not found' }) };
    let restrictions = null;
    try {
      const restrictionsResponse = await fetch(`${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${encodedBookingId}&select=*`, { headers: restHeaders });
      if (restrictionsResponse.ok) {
        const restrictionsData = await restrictionsResponse.json();
        if (restrictionsData?.length) restrictions = restrictionsData[0];
      }
    } catch (err) {
      console.warn('Could not fetch food restrictions:', err?.message || err);
    }
    const guestDetails = {
      id: booking.id,
      business_id: booking.business_id || null,
      guest_name: booking.guest_name || '', guest_first_name: booking.guest_first_name || '', guest_last_name: booking.guest_last_name || '',
      guest_email: booking.guest_email || '', guest_phone: booking.guest_phone || '', guest_country: booking.guest_country || '',
      arriving_from: booking.arriving_from || '', next_destination: booking.next_destination || '',
      guests: (booking.adults || 0) + (booking.children || 0), adults: booking.adults || 0, children: booking.children || 0,
      check_in_date: booking.check_in_date, check_out_date: booking.check_out_date || '', nights: booking.nights || 1,
      booking_reference: String(booking.id).substring(0, 8).toUpperCase(), room_id: booking.room_id || null,
      room_number: booking.room_number ?? null, room_name: booking.room_name || null, food_restrictions: restrictions || null
    };
    return { statusCode: 200, headers, body: JSON.stringify(guestDetails) };
  } catch (error) {
    console.error('Error fetching guest details:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch guest details' }) };
  }
};
