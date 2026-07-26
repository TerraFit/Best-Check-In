// netlify/functions/assign-room-to-booking.js
// ✅ FIXED: Uses booking_id properly to only update one booking

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
    const body = JSON.parse(event.body);
    console.log('📥 assign-room-to-booking received:', body);

    const { bookingId, roomId, roomNumber, roomName } = body;

    // ✅ Validate required fields
    if (!bookingId) {
      console.error('❌ Missing bookingId');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Booking ID required' })
      };
    }

    if (!roomNumber) {
      console.error('❌ Missing roomNumber');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Room number required' })
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

    console.log(`📝 Assigning room ${roomNumber} to booking ${bookingId}`);

    // ✅ 1. First, check if the booking exists and get its current data
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=id,guest_name,business_id,room_number`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('❌ Booking check failed:', errorText);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Booking not found' })
      };
    }

    const bookingData = await checkResponse.json();
    const booking = bookingData[0];

    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Booking not found' })
      };
    }

    console.log(`✅ Found booking: ${booking.guest_name} (ID: ${booking.id})`);
    console.log(`📌 Current room: ${booking.room_number || 'None'}`);

    // ✅ 2. Prepare update data - ONLY update the specific booking by ID
    const updateData = {
      room_number: roomNumber,
      room_name: roomName || null,
      updated_at: new Date().toISOString()
    };

    // ✅ Only add room_id if it's a valid UUID
    if (roomId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(roomId)) {
        updateData.room_id = roomId;
        console.log(`✅ Using room_id: ${roomId}`);
      } else {
        console.log(`⚠️ roomId "${roomId}" is not a valid UUID, skipping room_id`);
        // Try to find the room by room_number to get its UUID
        try {
          const roomLookupResponse = await fetch(
            `${supabaseUrl}/rest/v1/rooms?room_number=eq.${roomNumber}&business_id=eq.${booking.business_id}&select=id`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }
          );
          
          if (roomLookupResponse.ok) {
            const roomData = await roomLookupResponse.json();
            if (roomData && roomData.length > 0) {
              updateData.room_id = roomData[0].id;
              console.log(`✅ Found room UUID: ${roomData[0].id}`);
            }
          }
        } catch (lookupError) {
          console.warn('Could not look up room UUID:', lookupError);
        }
      }
    }

    console.log('📝 Update data:', updateData);

    // ✅ CRITICAL: Update ONLY the specific booking by its ID
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Update failed:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to assign room',
          details: errorText
        })
      };
    }

    const updatedData = await updateResponse.json();
    const updatedBooking = updatedData[0];
    
    if (!updatedBooking) {
      console.error('❌ No booking returned after update');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'No booking returned after update' })
      };
    }

    console.log(`✅ Room ${roomNumber} assigned to ${updatedBooking.guest_name} (ID: ${updatedBooking.id})`);

    // ✅ 3. Create audit log
    try {
      const authHeader = event.headers.authorization || '';
      let userId = 'system';
      let userName = 'System';

      try {
        const token = authHeader.replace('Bearer ', '');
        if (token) {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
          userId = decoded.sub || 'system';
          userName = decoded.user_metadata?.full_name || 
                     decoded.user_metadata?.name || 
                     'System';
        }
      } catch (e) {
        console.warn('Could not extract user from token:', e.message);
      }

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
        description: `Room ${roomNumber} (${roomName || ''}) assigned to ${updatedBooking.guest_name}`,
        booking_id: bookingId,
        guest_name: updatedBooking.guest_name,
        ip_address: event.headers['client-ip'] || 'unknown',
        user_agent: event.headers['user-agent'] || 'unknown',
        created_at: new Date().toISOString()
      };

      const auditResponse = await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([auditLog])
      });

      if (auditResponse.ok) {
        console.log('✅ Audit log created for room assignment');
      } else {
        const auditError = await auditResponse.text();
        console.warn('⚠️ Audit log error:', auditError);
      }
    } catch (auditError) {
      console.warn('⚠️ Audit log error (non-critical):', auditError);
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
    console.error('❌ Error assigning room:', error);
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
