// netlify/functions/get-rooms.js
// ✅ ES Module version - using import

import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
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
        body: JSON.stringify({ error: 'Business ID is required' })
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📡 Fetching rooms for business: ${businessId}`);

    const { data, error, count } = await supabase
      .from('rooms')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .eq('status', 'available')
      .order('room_number', { ascending: true });

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch rooms',
          details: error.message
        })
      };
    }

    console.log(`✅ Found ${data?.length || 0} available rooms`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data || [],
        count: count || 0,
        businessId: businessId
      })
    };

  } catch (error) {
    console.error('❌ Error in get-rooms:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch rooms'
      })
    };
  }
};
