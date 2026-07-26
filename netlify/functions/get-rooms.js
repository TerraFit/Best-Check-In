// netlify/functions/get-rooms.js
// ✅ FIXED: Proper error handling

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { businessId } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    console.log(`📡 Fetching rooms for business: ${businessId}`);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&status=eq.active&order=room_number.asc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error fetching rooms:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch rooms',
          details: error
        })
      };
    }

    const data = await response.json();
    console.log(`✅ Found ${data.length} rooms`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || [])
    };

  } catch (error) {
    console.error('❌ Error in get-rooms:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Failed to fetch rooms',
        stack: error.stack
      })
    };
  }
};
