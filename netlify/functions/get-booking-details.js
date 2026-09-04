// netlify/functions/get-booking-details.js
import auth from './_auth.cjs';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);
  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) return authFailure({ status: 403, error: 'Missing permission: platform:businesses:read' }, headers);
  } else if (!requireBusinessPermission(principal, 'canViewDashboard')) {
    return authFailure({ status: 403, error: 'Missing permission: canViewDashboard' }, headers);
  }

  try {
    const { bookingId } = event.queryStringParameters || {};
    if (!bookingId || typeof bookingId !== 'string' || bookingId.length > 200) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Booking ID required' }) };
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Booking details configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const readHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' };
    const response = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,business_id,guest_name,guest_first_name,guest_last_name,guest_email,guest_phone,guest_country,guest_province,guest_city,arriving_from,adults,children,check_in_date,check_out_date,nights,booking_source,referral_source,created_at,updated_at`, { headers: readHeaders });
    if (!response.ok) {
      console.error('Booking lookup failed:', response.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch booking details' }) };
    }
    const data = await response.json();
    const booking = Array.isArray(data) ? data[0] : null;
    if (!booking) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Booking not found' }) };

    const scope = resolveTenant(principal, booking.business_id);
    if (!scope.ok) return authFailure(scope, headers);

    let foodRestrictions = null;
    try {
      const restrictionsResponse = await fetch(`${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${encodeURIComponent(bookingId)}&select=*`, { headers: readHeaders });
      if (restrictionsResponse.ok) {
        const restrictionsData = await restrictionsResponse.json();
        if (Array.isArray(restrictionsData) && restrictionsData.length > 0) foodRestrictions = restrictionsData[0];
      } else console.warn('Food restrictions fetch failed:', restrictionsResponse.status);
    } catch (error) {
      console.warn('Could not fetch food restrictions:', error?.message || error);
    }

    const guestDetails = {
      id: booking.id,
      guest_name: booking.guest_name || '',
      guest_first_name: booking.guest_first_name || '',
      guest_last_name: booking.guest_last_name || '',
      guest_email: booking.guest_email || '',
      guest_phone: booking.guest_phone || '',
      guest_country: booking.guest_country || '',
      guest_province: booking.guest_province || '',
      guest_city: booking.guest_city || '',
      arriving_from: booking.arriving_from || '',
      guests: (booking.adults || 0) + (booking.children || 0),
      adults: booking.adults || 0,
      children: booking.children || 0,
      check_in_date: booking.check_in_date || '',
      check_out_date: booking.check_out_date || '',
      nights: booking.nights || 1,
      booking_reference: booking.id,
      booking_source: booking.booking_source || '',
      referral_source: booking.referral_source || '',
      food_restrictions: foodRestrictions,
      created_at: booking.created_at,
      updated_at: booking.updated_at
    };
    return { statusCode: 200, headers, body: JSON.stringify(guestDetails) };
  } catch (error) {
    console.error('Error fetching booking details:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
