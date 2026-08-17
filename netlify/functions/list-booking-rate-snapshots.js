// netlify/functions/list-booking-rate-snapshots.js
// READ-ONLY access to booking_rate_snapshots.
// No INSERT / UPDATE / DELETE — immutability enforced by DB + this endpoint.

const {
  json,
  optionsResponse,
  requireBusinessAuth,
  supabaseConfig,
  restHeaders,
  mapDbError,
} = require('./lib/rate-auth');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return optionsResponse();

  if (event.httpMethod !== 'GET') {
    return json(405, {
      error: 'Method not allowed. booking_rate_snapshots are read-only.',
    });
  }

  const auth = requireBusinessAuth(event);
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const cfg = supabaseConfig();
  if (!cfg) return json(500, { error: 'Server configuration error' });
  const { supabaseUrl, supabaseKey } = cfg;

  try {
    const qs = event.queryStringParameters || {};
    if (qs.businessId && qs.businessId !== businessId) {
      return json(403, { error: 'businessId does not match authenticated business' });
    }

    let path =
      'booking_rate_snapshots?business_id=eq.' +
      encodeURIComponent(businessId) +
      '&order=stay_date.asc';

    if (qs.bookingId) {
      path += '&booking_id=eq.' + encodeURIComponent(qs.bookingId);
    }
    if (qs.fromDate) {
      path += '&stay_date=gte.' + encodeURIComponent(qs.fromDate);
    }
    if (qs.toDate) {
      path += '&stay_date=lte.' + encodeURIComponent(qs.toDate);
    }
    if (qs.roomId) {
      path += '&room_id=eq.' + encodeURIComponent(qs.roomId);
    }

    const res = await fetch(supabaseUrl + '/rest/v1/' + path, {
      headers: restHeaders(supabaseKey),
    });
    if (!res.ok) {
      const t = await res.text();
      const mapped = mapDbError(res.status, t);
      return json(mapped.status, { error: mapped.error });
    }
    const data = await res.json();
    return json(200, { success: true, data: data || [] });
  } catch (err) {
    console.error('list-booking-rate-snapshots fatal:', err);
    return json(500, { error: err.message || 'Internal server error' });
  }
};
