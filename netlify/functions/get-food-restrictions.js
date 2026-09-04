// netlify/functions/get-food-restrictions.js
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
      console.error('Food restrictions configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const readHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' };
    const bookingResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,business_id`, { headers: readHeaders });
    if (!bookingResponse.ok) {
      console.error('Booking lookup failed:', bookingResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to verify booking' }) };
    }
    const bookings = await bookingResponse.json();
    const booking = Array.isArray(bookings) ? bookings[0] : null;
    if (!booking) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Booking not found' }) };

    const scope = resolveTenant(principal, booking.business_id);
    if (!scope.ok) return authFailure(scope, headers);

    const response = await fetch(`${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${encodeURIComponent(bookingId)}&select=*`, { headers: readHeaders });
    if (!response.ok) {
      console.error('Food restrictions fetch failed:', response.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch food restrictions' }) };
    }
    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(data[0] || null) };
  } catch (error) {
    console.error('Error fetching food restrictions:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
