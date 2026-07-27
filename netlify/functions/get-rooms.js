// netlify/functions/get-rooms.js
// ✅ FIXED: Proper error handling
// ✅ CORRECTED: Using your actual table schema

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Get businessId from query parameters
    const { businessId } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID is required' })
      };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error: Missing Supabase credentials' 
        })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📡 Fetching rooms for business: ${businessId}`);

    // ✅ Query using your actual table schema
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
          error: 'Failed to fetch rooms from database',
          details: error.message
        })
      };
    }

    console.log(`✅ Found ${data?.length || 0} available rooms for business ${businessId}`);

    // Return the rooms array
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
        error: error.message || 'Failed to fetch rooms',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
