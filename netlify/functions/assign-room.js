// netlify/functions/assign-room.js
// ✅ CORRECT: Uses CommonJS (require) - no import statements

// Use require instead of import
const { createHandlerResponse } = require('./lib/supabase-rest.js');

// Since we need supabaseRpc, we'll use direct fetch calls
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// Helper function to call Supabase RPC via REST
async function supabaseRpc(functionName, params) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RPC error ${response.status}: ${errorText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

exports.handler = async (event) => {
  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return createHandlerResponse(204, {});
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return createHandlerResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const { bookingId, roomId, action } = JSON.parse(event.body);

    if (!bookingId) {
      return createHandlerResponse(400, {
        error: 'Missing required field: bookingId'
      });
    }

    console.log(`📝 Action: ${action || 'assign'} for booking ${bookingId}, room: ${roomId || 'none'}`);

    // ✅ REMOVE - Use atomic RPC
    if (action === 'remove') {
      const result = await supabaseRpc('remove_room_safely', {
        p_booking_id: bookingId
      });

      const rpcResult = Array.isArray(result) ? result[0] : result;

      if (!rpcResult || !rpcResult.success) {
        const errorMsg = rpcResult?.error || 'Failed to remove room';
        console.warn(`⚠️ Room removal failed: ${errorMsg}`);
        return createHandlerResponse(409, {
          success: false,
          error: errorMsg,
          details: rpcResult
        });
      }

      console.log(`✅ Room ${rpcResult.room_number} removed from booking ${bookingId}`);

      return createHandlerResponse(200, {
        success: true,
        data: {
          bookingId: rpcResult.booking_id,
          roomId: rpcResult.room_id,
          roomNumber: rpcResult.room_number,
          guestName: rpcResult.guest_name
        },
        message: `Room ${rpcResult.room_number} removed from ${rpcResult.guest_name} successfully`
      });
    }

    // ✅ ASSIGN or CHANGE - Need roomId
    if (!roomId) {
      return createHandlerResponse(400, {
        error: 'Missing required field: roomId for assign or change action'
      });
    }

    // ✅ Get booking details to determine action
    const bookingUrl = `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,guest_name,status,room_id,business_id`;
    const bookingResponse = await fetch(bookingUrl, { headers });
    
    if (!bookingResponse.ok) {
      return createHandlerResponse(404, { error: 'Booking not found' });
    }

    const bookings = await bookingResponse.json();
    if (!bookings || bookings.length === 0) {
      return createHandlerResponse(404, { error: 'Booking not found' });
    }

    const booking = bookings[0];

    // ✅ Determine which RPC to call
    let rpcName = 'assign_room_safely';
    let rpcParams = {
      p_booking_id: bookingId,
      p_room_id: roomId
    };

    if (action === 'change' || (booking.room_id && booking.room_id !== roomId)) {
      if (!booking.room_id) {
        return createHandlerResponse(400, { 
          error: 'Booking has no room to change from. Use assign action instead.'
        });
      }
      rpcName = 'change_room_safely';
      rpcParams = {
        p_booking_id: bookingId,
        p_old_room_id: booking.room_id,
        p_new_room_id: roomId
      };
    } else if (booking.room_id && booking.room_id === roomId) {
      return createHandlerResponse(400, {
        error: 'Room is already assigned to this booking'
      });
    }

    // ✅ Execute RPC
    const result = await supabaseRpc(rpcName, rpcParams);
    const rpcResult = Array.isArray(result) ? result[0] : result;

    if (!rpcResult || !rpcResult.success) {
      const errorMsg = rpcResult?.error || 'Failed to assign room';
      console.warn(`⚠️ Room allocation failed: ${errorMsg}`);

      let statusCode = 409;
      if (errorMsg === 'Booking not found' || errorMsg === 'Room not found' || 
          errorMsg.includes('not found') || errorMsg.includes('does not belong')) {
        statusCode = 404;
      } else if (errorMsg === 'Room is not available for allocation' || 
                 errorMsg === 'New room is not available') {
        statusCode = 400;
      }

      return createHandlerResponse(statusCode, {
        success: false,
        error: errorMsg,
        details: rpcResult
      });
    }

    const successMessage = action === 'change' 
      ? `Room changed from ${rpcResult.old_room_number} to ${rpcResult.new_room_number}`
      : `Room ${rpcResult.room_number} assigned to ${rpcResult.guest_name}`;

    console.log(`✅ ${successMessage}`);

    return createHandlerResponse(200, {
      success: true,
      data: rpcResult,
      message: `${successMessage} successfully`
    });

  } catch (error) {
    console.error('❌ Error in assign-room:', error);
    return createHandlerResponse(500, {
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
