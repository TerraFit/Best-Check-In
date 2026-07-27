// netlify/functions/get-available-rooms.js
// ✅ ES Module version

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

    console.log(`📡 Fetching available rooms for business: ${businessId}`);

    // Get all rooms that are available (not occupied)
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        id,
        room_number,
        room_name,
        room_type,
        floor,
        status,
        room_allocations!left(
          id,
          status,
          bookings!inner(
            guest_name,
            check_out_date
          )
        )
      `)
      .eq('business_id', businessId)
      .eq('status', 'available')
      .or('room_allocations.status.is.null,room_allocations.status.neq.active')
      .order('room_number', { ascending: true });

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch available rooms',
          details: error.message
        })
      };
    }

    // Format the response
    const rooms = (data || []).map(room => ({
      id: room.id,
      room_number: room.room_number,
      room_name: room.room_name,
      room_type: room.room_type,
      floor: room.floor,
      status: room.status,
      is_available: true,
      current_guest: null,
      current_checkout: null
    }));

    console.log(`✅ Found ${rooms.length} available rooms`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        rooms: rooms,
        count: rooms.length,
        businessId: businessId
      })
    };

  } catch (error) {
    console.error('❌ Error in get-available-rooms:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch available rooms'
      })
    };
  }
};
