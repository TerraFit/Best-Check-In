// netlify/functions/assign-room.js
// ✅ ES Module version - use import instead of require

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
          error: 'Missing required fields: bookingId and roomId are required',
        }),
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
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, guest_name, status, check_in_date, check_out_date, room_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Booking not found' }),
      };
    }

    // Check if booking already has a room
    if (booking.room_id) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: 'This booking already has a room assigned',
          currentRoomId: booking.room_id,
        }),
      };
    }

    // Check if room exists and get room details
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, room_number, room_name, room_type, floor, status')
      .eq('id', roomId)
      .eq('business_id', booking.business_id)
      .single();

    if (roomError || !room) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Room not found' }),
      };
    }

    // Check if room is already occupied
    const { data: existingAllocation, error: allocationError } = await supabase
      .from('room_allocations')
      .select(`
        booking_id,
        bookings!inner(guest_name, check_in_date, check_out_date)
      `)
      .eq('room_id', roomId)
      .eq('status', 'active')
      .neq('booking_id', bookingId)
      .gte('bookings.check_out_date', booking.check_in_date)
      .lte('bookings.check_in_date', booking.check_out_date);

    if (existingAllocation && existingAllocation.length > 0) {
      const existing = existingAllocation[0];
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: `Room ${room.room_number} is already occupied by ${existing.bookings.guest_name}`,
        }),
      };
    }

    // Start a transaction using Supabase
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        room_id: roomId,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to assign room' }),
      };
    }

    // Create room allocation record
    const { error: allocationInsertError } = await supabase
      .from('room_allocations')
      .insert({
        booking_id: bookingId,
        room_id: roomId,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        status: 'active',
        assigned_at: new Date().toISOString()
      });

    if (allocationInsertError) {
      console.error('Error creating allocation:', allocationInsertError);
      // Rollback: remove room_id from booking
      await supabase
        .from('bookings')
        .update({ room_id: null })
        .eq('id', bookingId);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create room allocation' }),
      };
    }

    // Update room status to occupied
    await supabase
      .from('rooms')
      .update({ 
        status: 'occupied',
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          bookingId: updatedBooking.id,
          roomId: roomId,
          roomNumber: room.room_number,
          roomName: room.room_name,
          guestName: updatedBooking.guest_name,
        },
        message: `Room ${room.room_number} assigned to ${updatedBooking.guest_name} successfully`,
      }),
    };

  } catch (error) {
    console.error('Error in assign-room:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Internal server error',
      }),
    };
  }
};
