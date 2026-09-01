// netlify/functions/get-guest-profile.js
// Public returning-guest lookup. This endpoint remains public for the current
// check-in UX, but it must never expose identity documents or contact/location
// history to an unauthenticated caller.

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
    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Email required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const response = await fetch(
      `${supabaseUrl}/rest/v1/guest_profiles?email=eq.${encodeURIComponent(normalizedEmail)}&select=full_name,country`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
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

    // Deliberately minimal. Passport/ID, phone, city, province and visit
    // history must not be exposed by an anonymous email-based lookup.
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
