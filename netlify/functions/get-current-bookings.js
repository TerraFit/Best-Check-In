// netlify/functions/get-current-bookings.js
// ✅ CORRECTED: Using your actual table schema

const { pool } = require('../lib/db');

exports.handler = async (event) => {
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
    // ✅ Using your actual column names
    const query = `
      SELECT 
        b.id,
        b.guest_name,
        b.guest_first_name,
        b.guest_last_name,
        b.guest_email,
        b.guest_phone,
        b.guest_country,
        b.guest_province,
        b.guest_city,
        b.check_in_date,
        b.check_out_date,
        b.nights,
        b.adults,
        b.children,
        b.status,
        b.total_amount,
        b.room_id,
        r.room_number,
        r.room_name,
        r.room_type,
        r.floor,
        r.status AS room_status,
        ra.id AS allocation_id,
        ra.status AS allocation_status
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_allocations ra ON b.id = ra.booking_id AND ra.status = 'active'
      WHERE b.business_id = $1
        AND (b.status = 'checked_in' OR b.status = 'Checked-In' OR b.status = 'stayover')
        AND b.check_out_date >= CURRENT_DATE
      ORDER BY b.check_in_date ASC, b.guest_name ASC
    `;

    const result = await pool.query(query, [businessId]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        bookings: result.rows,
        count: result.rows.length,
      }),
    };

  } catch (error) {
    console.error('Error fetching current bookings:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to fetch current bookings',
      }),
    };
  }
};
