// netlify/functions/remove-room-from-booking.js
// ✅ CORRECTED: Using your actual table schema

const { pool } = require('../lib/db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { bookingId } = JSON.parse(event.body);

    if (!bookingId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Booking ID is required' }),
      };
    }

    // Get the room_id before removing
    const roomCheck = await pool.query(
      `SELECT room_id FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (roomCheck.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Booking not found' }),
      };
    }

    const roomId = roomCheck.rows[0].room_id;

    if (!roomId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No room assigned to this booking' }),
      };
    }

    // Begin transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update booking - remove room_id
      await client.query(
        `UPDATE bookings 
         SET room_id = NULL, updated_at = NOW() 
         WHERE id = $1`,
        [bookingId]
      );

      // Update room allocation status to 'cancelled'
      await client.query(
        `UPDATE room_allocations 
         SET status = 'cancelled' 
         WHERE booking_id = $1 AND status = 'active'`,
        [bookingId]
      );

      // Update room status back to 'available'
      await client.query(
        `UPDATE rooms 
         SET status = 'available', 
             updated_at = NOW() 
         WHERE id = $1`,
        [roomId]
      );

      await client.query('COMMIT');

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Room removed from booking successfully',
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
    console.error('Error removing room from booking:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
      }),
    };
  }
};
