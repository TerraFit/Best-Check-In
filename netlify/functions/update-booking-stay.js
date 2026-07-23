// netlify/functions/update-booking-stay.js
// ✅ Update check-in/out dates and nights with audit logging

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
    const body = JSON.parse(event.body);
    const { bookingId, check_in_date, check_out_date, nights } = body;

    console.log('📅 Updating stay for booking:', bookingId);
    console.log('📅 Data:', { check_in_date, check_out_date, nights });

    if (!bookingId) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Booking ID required' }) 
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

    // ✅ Get current booking data for audit trail
    const currentResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!currentResponse.ok) {
      console.error('❌ Failed to fetch current booking:', await currentResponse.text());
    }

    const currentData = await currentResponse.json();
    const currentBooking = currentData[0];

    // Build update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    const changes = {};

    if (check_in_date && check_in_date !== currentBooking?.check_in_date) {
      updateData.check_in_date = check_in_date;
      changes.check_in_date = { from: currentBooking?.check_in_date, to: check_in_date };
    }
    if (check_out_date && check_out_date !== currentBooking?.check_out_date) {
      updateData.check_out_date = check_out_date;
      changes.check_out_date = { from: currentBooking?.check_out_date, to: check_out_date };
    }
    if (nights !== undefined && nights !== null && nights !== currentBooking?.nights) {
      updateData.nights = nights;
      changes.nights = { from: currentBooking?.nights, to: nights };
    }

    console.log('📝 Update data:', updateData);
    console.log('📝 Changes:', changes);

    // Update booking
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Update error:', errorText);
      throw new Error(`HTTP ${updateResponse.status}: ${errorText}`);
    }

    const result = await updateResponse.json();
    const updatedBooking = result[0];

    console.log('✅ Updated booking:', updatedBooking);

    // ✅ Create audit log for stay changes
    if (Object.keys(changes).length > 0) {
      try {
        // Get user from auth header
        const authHeader = event.headers.authorization || '';
        let userId = 'unknown';
        let userName = 'Unknown User';

        // Try to extract user info from token
        try {
          const token = authHeader.replace('Bearer ', '');
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
          userId = decoded.sub || 'unknown';
          userName = decoded.user_metadata?.full_name || decoded.user_metadata?.name || 'Unknown User';
        } catch (tokenError) {
          console.warn('Could not extract user from token:', tokenError.message);
        }

        const auditLog = {
          business_id: updatedBooking.business_id,
          user_id: userId,
          user_name: userName,
          action: 'UPDATE_STAY_DETAILS',
          details: changes,
          description: `Updated stay details for guest ${updatedBooking.guest_name || 'Unknown'}`,
          booking_id: bookingId,
          ip_address: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown',
          user_agent: event.headers['user-agent'] || 'unknown',
          created_at: new Date().toISOString()
        };

        console.log('📝 Audit log:', auditLog);

        await fetch(
          `${supabaseUrl}/rest/v1/audit_logs`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify([auditLog])
          }
        );
        console.log('✅ Audit log created for stay update');
      } catch (auditError) {
        console.warn('⚠️ Audit log error (non-critical):', auditError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        booking: updatedBooking,
        changes: changes,
        message: 'Stay details updated successfully'
      })
    };

  } catch (error) {
    console.error('❌ Error updating stay details:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to update stay details' 
      })
    };
  }
};
