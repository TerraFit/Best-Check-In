// netlify/functions/get-guest-profile.js
// Public returning-guest lookup. This endpoint remains public for the current
// check-in UX, but it is strictly bound to the requested establishment.

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

    // Returning-guest data comes only from a booking belonging to this
    // establishment. Never consult the legacy global guest_profiles table.
    const bookingResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?business_id=eq.${encodedBusinessId}&guest_email=eq.${encodedEmail}&select=id,business_id,guest_name,guest_first_name,guest_last_name,guest_country,guest_phone,guest_id_number,guest_province,guest_city&order=created_at.desc&limit=1`,
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

    const fullName =
      booking.guest_name ||
      [booking.guest_first_name, booking.guest_last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

    let firstName = booking.guest_first_name || '';
    let lastName = booking.guest_last_name || '';

    if (!firstName && !lastName && fullName) {
      const nameParts = fullName.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        profile: {
          full_name: fullName || '',
          first_name: firstName,
          last_name: lastName,
          country: booking.guest_country || '',
          phone: booking.guest_phone || '',
          passport_or_id: booking.guest_id_number || '',
          province: booking.guest_province || '',
          city: booking.guest_city || ''
        }
      })
    };
  } catch (error) {
    console.error('Guest profile function error:', error?.message || 'unknown error');
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
