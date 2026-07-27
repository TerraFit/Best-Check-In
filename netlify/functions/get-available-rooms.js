// netlify/functions/get-available-rooms.js
// ✅ FINAL DIAGNOSTIC VERSION - Pure fetch, NO Supabase client
// ✅ Add this, deploy, and check the response

export const handler = async (event) => {
  // 🔥 UNMISTAKABLE LOG - Check Netlify Function logs
  console.log('🚀🚀🚀 FINAL DIAGNOSTIC - PURE FETCH VERSION 🚀🚀🚀');

  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { businessId } = event.queryStringParameters || {};

    if (!businessId) {
      console.error('❌ Missing businessId');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Business ID is required'
        })
      };
    }

    console.log(`📡 Fetching rooms for business: ${businessId}`);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Server configuration error: Missing Supabase credentials'
        })
      };
    }

    // ✅ PURE REST - NO Supabase client, NO WebSocket
    const url = `${supabaseUrl}/rest/v1/rooms?business_id=eq.${encodeURIComponent(businessId)}&order=room_number.asc`;
    console.log(`📡 URL: ${url}`);

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const text = await response.text();
    console.log(`📡 Supabase status: ${response.status}`);
    console.log(`📡 Response length: ${text.length} chars`);

    if (!response.ok) {
      console.error(`❌ Supabase error: ${text}`);
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: `Supabase API error: ${response.status}`,
          details: text
        })
      };
    }

    const rooms = JSON.parse(text);
    console.log(`✅ Found ${rooms.length} rooms`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        rooms: rooms,
        count: rooms.length,
        businessId: businessId,
        diagnostic: 'REST_ONLY_FUNCTION_WORKING'
      })
    };

  } catch (error) {
    console.error('❌ Unhandled error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        stack: error.stack
      })
    };
  }
};
