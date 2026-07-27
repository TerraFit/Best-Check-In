// netlify/functions/assign-room.js
// ✅ FIXED: Per-booking room assignment with validation

const { pool } = require('../lib/db');

exports.handler = async (event) => {
  // ✅ Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { bookingId, roomId } = JSON.parse(event.body);

    // ✅ Validate required fields
    if (!bookingId || !roomId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: bookingId and roomId are required',
        }),
      };
    }

    // ✅ Check if the booking exists
    const bookingCheck = await pool.query(
      `SELECT id, guest_name, status, check_in_date, check_out_date 
       FROM bookings 
       WHERE id = $1`,
      [bookingId]
    );

    if (bookingCheck.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Booking not found' }),
      };
    }

    const booking = bookingCheck.rows[0];

    // ✅ Check if booking already has a room
    if (booking.room_id) {
      return {
        statusCode: 409,
        body: JSON.stringify({ 
          error: 'This booking already has a room assigned',
          currentRoomId: booking.room_id,
        }),
      };
    }

    // ✅ Check if the room exists
    const roomCheck = await pool.query(
      `SELECT id, number, name, status 
       FROM rooms 
       WHERE id = $1 AND business_id = (SELECT business_id FROM bookings WHERE id = $2)`,
      [roomId, bookingId]
    );

    if (roomCheck.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Room not found' }),
      };
    }

    const room = roomCheck.rows[0];

    // ✅ CRITICAL: Check if room is already occupied by another booking
    const existingAllocation = await pool.query(
      `SELECT 
        ra.booking_id,
        b.guest_name,
        b.check_in_date,
        b.check_out_date
       FROM room_allocations ra
       JOIN bookings b ON ra.booking_id = b.id
       WHERE ra.room_id = $1 
         AND ra.status = 'active'
         AND ra.booking_id != $2
         AND (
           (b.check_in_date <= (SELECT check_out_date FROM bookings WHERE id = $2))
           AND (b.check_out_date >= (SELECT check_in_date FROM bookings WHERE id = $2))
         )`,
      [roomId, bookingId]
    );

    if (existingAllocation.rows.length > 0) {
      const existing = existingAllocation.rows[0];
      return {
        statusCode: 409,
        body: JSON.stringify({ 
          error: `Room ${room.number} is already occupied by ${existing.guest_name} until ${existing.check_out_date}`,
          currentGuest: existing.guest_name,
          checkOutDate: existing.check_out_date,
        }),
      };
    }

    // ✅ Begin transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // ✅ Update booking with room_id
      const updateResult = await client.query(
        `UPDATE bookings 
         SET room_id = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, room_id, guest_name, status`,
        [roomId, bookingId]
      );

      // ✅ Create room allocation record
      await client.query(
        `INSERT INTO room_allocations (
          booking_id, 
          room_id, 
          check_in_date, 
          check_out_date, 
          status, 
          assigned_at
        ) VALUES ($1, $2, $3, $4, 'active', NOW())`,
        [
          bookingId,
          roomId,
          booking.check_in_date,
          booking.check_out_date,
        ]
      );

      // ✅ Update room status to occupied
      await client.query(
        `UPDATE rooms 
         SET status = 'occupied', 
             last_allocated_at = NOW() 
         WHERE id = $1`,
        [roomId]
      );

      await client.query('COMMIT');

      // ✅ Return success with full details
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            bookingId: updateResult.rows[0].id,
            roomId: roomId,
            roomNumber: room.number,
            guestName: updateResult.rows[0].guest_name,
            status: updateResult.rows[0].status,
          },
          message: `Room ${room.number} assigned to ${booking.guest_name} successfully`,
        }),
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Database transaction failed' }),
      };
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error assigning room:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
      }),
    };
  }
};
