// netlify/functions/remove-room-from-booking.js
// ✅ CORRECT: Removes room assignment

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
    const { bookingId } = JSON.parse(event.body);

    if (!bookingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Booking ID is required' })
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

    // Get booking with room_id
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, room_id, guest_name')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Booking not found' })
      };
    }

    const roomId = booking.room_id;

    if (!roomId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No room assigned to this booking' })
      };
    }

    // Update booking - remove room_id
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        room_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('❌ Error updating booking:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to remove room' })
      };
    }

    // Update room physical status back to available
    await supabase
      .from('rooms')
      .update({
        status: 'available',
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);

    console.log(`✅ Room removed from booking ${bookingId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Room removed from booking ${bookingId} successfully`
      })
    };

  } catch (error) {
    console.error('❌ Error in remove-room-from-booking:', error);
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
