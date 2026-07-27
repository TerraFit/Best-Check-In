// netlify/functions/assign-room.js
// ✅ CORRECT: Uses atomic RPC function for race condition protection

import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { bookingId, roomId } = JSON.parse(event.body);

    if (!bookingId || !roomId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: bookingId and roomId are required'
        })
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

    console.log(`📝 Assigning room ${roomId} to booking ${bookingId}`);

    // ✅ Use the atomic RPC function
    const { data: result, error: rpcError } = await supabase
      .rpc('assign_room_safely', {
        p_booking_id: bookingId,
        p_room_id: roomId
      });

    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: rpcError.message || 'Failed to assign room'
        })
      };
    }

    // ✅ Check the result
    if (!result.success) {
      console.warn(`⚠️ Room allocation failed: ${result.error}`);

      // Map error to appropriate HTTP status
      let statusCode = 409; // Conflict by default

      if (result.error === 'Booking not found' || result.error === 'Room not found') {
        statusCode = 404;
      } else if (result.error === 'Room is not available for allocation') {
        statusCode = 400;
      }

      return {
        statusCode,
        headers,
        body: JSON.stringify({
          success: false,
          error: result.error,
          details: result
        })
      };
    }

    console.log(`✅ Room ${result.room_number} assigned to ${result.guest_name}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          bookingId: result.booking_id,
          roomId: result.room_id,
          roomNumber: result.room_number,
          guestName: result.guest_name
        },
        message: `Room ${result.room_number} assigned to ${result.guest_name} successfully`
      })
    };

  } catch (error) {
    console.error('❌ Error in assign-room:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};
