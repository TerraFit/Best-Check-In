// netlify/functions/assign-room-to-booking.js
// ✅ Assigns a room to a booking

exports.handler = async (event) => {
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
    const { bookingId, roomId, roomNumber, roomName } = JSON.parse(event.body);

    if (!bookingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Booking ID required' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // Update booking with room info
    const response = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        room_number: roomNumber || null,
        room_name: roomName || null,
        room_id: roomId || null,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Update error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to assign room' })
      };
    }

    const data = await response.json();
    const updatedBooking = data[0];

    // Create audit log
    try {
      const authHeader = event.headers.authorization || '';
      let userId = 'system';
      let userName = 'System';

      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.replace('Bearer ', '');
        if (token) {
          const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
          userId = decoded.sub || 'system';
          userName = decoded.user_metadata?.full_name || 
                     decoded.user_metadata?.name || 
                     'System';
        }
      } catch (e) {}

      const auditLog = {
        business_id: updatedBooking.business_id,
        user_id: userId,
        user_name: userName,
        user_role: 'owner',
        action: 'ROOM_ASSIGNED',
        details: {
          booking_id: bookingId,
          room_number: roomNumber,
          room_name: roomName,
          guest_name: updatedBooking.guest_name
        },
        description: `Room ${roomNumber} assigned to ${updatedBooking.guest_name}`,
        booking_id: bookingId,
        guest_name: updatedBooking.guest_name,
        ip_address: event.headers['client-ip'] || 'unknown',
        user_agent: event.headers['user-agent'] || 'unknown',
        created_at: new Date().toISOString()
      };

      await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([auditLog])
      });
    } catch (auditError) {
      console.warn('Audit log error:', auditError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: updatedBooking,
        message: `Room ${roomNumber} assigned successfully`
      })
    };

  } catch (error) {
    console.error('Error assigning room:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to assign room'
      })
    };
  }
};
