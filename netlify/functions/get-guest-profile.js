// netlify/functions/get-guest-profile.js
// Public returning-guest lookup. This endpoint remains public for the current
// check-in UX, but it must be bound to the requested establishment and must
// never expose identity documents or contact/location history.

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  try {
    const email = event.queryStringParameters?.email;
    const businessId = event.queryStringParameters?.business_id;
    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Email required' }) };
    }
    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Business ID required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const encodedBusinessId = encodeURIComponent(String(businessId));
    const encodedEmail = encodeURIComponent(normalizedEmail);
    const restHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Accept': 'application/json'
    };

    // Public lookup is allowed only for an approved, active establishment.
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodedBusinessId}&select=id,status,service_paused`,
      { headers: restHeaders }
    );
    if (!businessResponse.ok) {
      console.error('Business validation failed:', businessResponse.status);
      return { statusCode: 502, headers, body: JSON.stringify({ success: false, error: 'Failed to validate business' }) };
    }

    const businesses = await businessResponse.json();
    const business = Array.isArray(businesses) ? businesses[0] : null;
    if (
      !business ||
      business.id !== String(businessId) ||
      business.status !== 'approved' ||
      business.service_paused === true
    ) {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Business not available' }) };
    }

    // guest_profiles is global by email in the current schema. Prove that the
    // email belongs to this establishment before touching that global record.
    const bookingResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?business_id=eq.${encodedBusinessId}&guest_email=eq.${encodedEmail}&select=id,business_id&limit=1`,
      { headers: restHeaders }
    );
    if (!bookingResponse.ok) {
      console.error('Guest booking validation failed:', bookingResponse.status);
      return { statusCode: 502, headers, body: JSON.stringify({ success: false, error: 'Failed to validate guest' }) };
    }

    const bookings = await bookingResponse.json();
    const booking = Array.isArray(bookings) ? bookings[0] : null;
    if (!booking || booking.business_id !== String(businessId)) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, profile: null }) };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/guest_profiles?email=eq.${encodedEmail}&select=full_name,country`,
      { headers: restHeaders }
    );

    if (!response.ok) {
      console.error('Guest profile lookup failed:', response.status);
      return { statusCode: 502, headers, body: JSON.stringify({ success: false, error: 'Failed to load guest profile' }) };
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, profile: null }) };
    }

    const profile = data[0];
    let firstName = '';
    let lastName = '';
    if (profile.full_name) {
      const nameParts = profile.full_name.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        profile: {
          full_name: profile.full_name || '',
          first_name: firstName,
          last_name: lastName,
          country: profile.country || ''
        }
      })
    };
  } catch (error) {
    console.error('Guest profile function error:', error?.message || 'unknown error');
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
