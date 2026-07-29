// netlify/functions/get-rooms.js
// List rooms for a business (Phase 1)

exports.handler = async (event) => {
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
    const { businessId, includeInactive } = event.queryStringParameters || {};
    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    let path = `rooms?business_id=eq.${businessId}&order=sort_order.asc.nullslast,room_number.asc`;
    if (includeInactive !== 'true') {
      path += '&active=eq.true';
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('get-rooms error:', err);
      return { statusCode: response.status, headers, body: JSON.stringify({ error: err }) };
    }

    const rooms = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, rooms }),
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
