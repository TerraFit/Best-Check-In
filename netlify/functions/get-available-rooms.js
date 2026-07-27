// netlify/functions/get-available-rooms.js
// ✅ Returns rooms available for check-in (excludes occupied)

const { pool } = require('../lib/db');

exports.handler = async (event) => {
  // ✅ Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { businessId } = event.queryStringParameters;

  if (!businessId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Business ID is required' }),
    };
  }

  try {
    // ✅ Get all rooms for this business
    // ✅ Only include rooms that are NOT occupied
    const query = `
      SELECT 
        r.id,
        r.number,
        r.name,
        r.type,
        r.capacity,
        r.status,
        CASE 
          WHEN ra.id IS NOT NULL AND ra.status = 'active' 
            AND (b.status = 'checked_in' OR b.status = 'Checked-In' OR b.status = 'stayover')
          THEN false
          ELSE true
        END AS is_available,
        b.guest_name AS current_guest,
        b.check_out_date AS current_checkout
      FROM rooms r
      LEFT JOIN room_allocations ra ON r.id = ra.room_id AND ra.status = 'active'
      LEFT JOIN bookings b ON ra.booking_id = b.id 
        AND (b.status = 'checked_in' OR b.status = 'Checked-In' OR b.status = 'stayover')
      WHERE r.business_id = $1
        AND r.status != 'maintenance'
        AND r.status != 'cleaning'
      ORDER BY r.number ASC
    `;

    const result = await pool.query(query, [businessId]);

    // ✅ Filter to only available rooms
    const availableRooms = result.rows.filter(room => room.is_available === true);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        rooms: availableRooms,
        total_rooms: result.rows.length,
        available_count: availableRooms.length,
        occupied_count: result.rows.length - availableRooms.length,
      }),
    };

  } catch (error) {
    console.error('Error fetching available rooms:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to fetch available rooms',
      }),
    };
  }
};
