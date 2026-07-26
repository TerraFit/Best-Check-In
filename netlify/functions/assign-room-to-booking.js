// netlify/functions/assign-room-to-booking.js
// ✅ FIXED: Only updates columns that exist (room_id removed)

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

    // ✅ 1. First, check if the booking exists
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=id,guest_name,business_id`,
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

    console.log(`✅ Found booking: ${booking.guest_name}`);

    // ✅ 2. Update the booking with room info (ONLY columns that exist)
    // Remove room_id since it doesn't exist in the table
    const updateData = {
      room_number: roomNumber,
      room_name: roomName || null,
      updated_at: new Date().toISOString()
    };

    console.log('📝 Update data:', updateData);

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
      
      // If room_name doesn't exist, try without it
      if (errorText.includes('room_name')) {
        console.log('🔄 Retrying without room_name...');
        const retryData = {
          room_number: roomNumber,
          updated_at: new Date().toISOString()
        };
        
        const retryResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(retryData)
        });
        
        if (!retryResponse.ok) {
          const retryError = await retryResponse.text();
          console.error('❌ Retry failed:', retryError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Failed to assign room',
              details: retryError
            })
          };
        }
        
        const retryData_result = await retryResponse.json();
        const retryBooking = retryData_result[0];
        console.log(`✅ Room ${roomNumber} assigned to ${retryBooking?.guest_name || 'guest'}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: retryBooking,
            message: `Room ${roomNumber} assigned successfully`
          })
        };
      }
      
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
    console.log(`✅ Room ${roomNumber} assigned to ${updatedBooking.guest_name}`);

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
