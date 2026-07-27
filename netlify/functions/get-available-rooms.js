// netlify/functions/get-available-rooms.js
// ✅ CORRECT: Single source of truth - bookings.status

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

    // ✅ ACTIVE STATUSES - Single source of truth
    const ACTIVE_STATUSES = ['Checked-In', 'Stayover'];

    // ✅ Step 1: Get all active bookings with room_id
    const { data: activeBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('room_id')
      .eq('business_id', businessId)
      .in('status', ACTIVE_STATUSES)
      .not('room_id', 'is', null);

    if (bookingsError) {
      console.error('❌ Error fetching active bookings:', bookingsError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to fetch active bookings',
          details: bookingsError.message
        })
      };
    }

    // ✅ Step 2: Build Set of occupied room IDs (O(1) lookup)
    const occupiedRoomIds = new Set(
      (activeBookings || []).map(b => b.room_id).filter(id => id !== null)
    );

    console.log(`🔒 ${occupiedRoomIds.size} rooms are occupied`);

    // ✅ Step 3: Get all rooms for this business
    const { data: allRooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('business_id', businessId)
      .order('room_number', { ascending: true });

    if (roomsError) {
      console.error('❌ Error fetching rooms:', roomsError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to fetch rooms',
          details: roomsError.message
        })
      };
    }

    // ✅ Step 4: Filter available rooms
    // Available = NOT occupied AND physical status = 'available'
    const availableRooms = allRooms.filter(room => {
      const isOccupied = occupiedRoomIds.has(room.id);
      const isPhysicallyAvailable = room.status === 'available';
      return !isOccupied && isPhysicallyAvailable;
    });

    console.log(`✅ Found ${availableRooms.length} available rooms`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        rooms: availableRooms,
        total_rooms: allRooms.length,
        occupied_count: occupiedRoomIds.size,
        available_count: availableRooms.length,
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
