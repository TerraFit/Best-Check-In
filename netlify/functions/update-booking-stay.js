const jwt = require('jsonwebtoken');

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

    // ============================================================
    // ✅ 1. GET CURRENT BOOKING DATA FOR AUDIT LOG
    // ============================================================
    const currentResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=id,guest_name,business_id,check_in_date,check_out_date,nights`,
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

    // ============================================================
    // ✅ 2. BUILD UPDATE DATA AND TRACK CHANGES
    // ============================================================
    const updateData = {
      updated_at: new Date().toISOString()
    };

    const changes = {};

    if (check_in_date !== undefined && check_in_date !== null) {
      if (check_in_date !== currentBooking?.check_in_date) {
        updateData.check_in_date = check_in_date;
        changes.check_in_date = { 
          from: currentBooking?.check_in_date || 'not set', 
          to: check_in_date 
        };
      }
    }

    if (check_out_date !== undefined && check_out_date !== null) {
      if (check_out_date !== currentBooking?.check_out_date) {
        updateData.check_out_date = check_out_date;
        changes.check_out_date = { 
          from: currentBooking?.check_out_date || 'not set', 
          to: check_out_date 
        };
      }
    }

    if (nights !== undefined && nights !== null) {
      const newNights = parseInt(nights);
      const oldNights = parseInt(currentBooking?.nights) || 1;
      if (newNights !== oldNights) {
        updateData.nights = newNights;
        changes.nights = { from: oldNights, to: newNights };
      }
    }

    // If no changes, return early
    if (Object.keys(changes).length === 0) {
      console.log('ℹ️ No changes detected');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          booking: currentBooking,
          message: 'No changes needed'
        })
      };
    }

    console.log('📝 Update data:', updateData);
    console.log('📝 Changes:', changes);

    // ============================================================
    // ✅ 3. UPDATE BOOKING
    // ============================================================
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

    // ============================================================
    // ✅ 4. CREATE AUDIT LOG (COMPLETELY REWRITTEN)
    // ============================================================
    try {
      // ✅ Get user from auth header - with proper fallback
      const authHeader = event.headers.authorization || '';
      let userId = '00000000-0000-0000-0000-000000000000'; // ✅ Valid UUID fallback
      let userName = 'System';
      let userRole = 'owner';

      try {
        const token = authHeader.replace('Bearer ', '');
        if (token) {
          const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
          userId = decoded.sub || '00000000-0000-0000-0000-000000000000';
          userName = decoded.user_metadata?.full_name || 
                     decoded.user_metadata?.name || 
                     decoded.user_metadata?.business_name ||
                     'System';
          userRole = decoded.user_metadata?.role || 'owner';
        }
      } catch (tokenError) {
        console.warn('Could not extract user from token:', tokenError.message);
      }

      // ✅ Get guest name for description
      const guestName = currentBooking?.guest_name || 'Unknown Guest';
      const businessId = updatedBooking?.business_id || currentBooking?.business_id || 'unknown';

      // ✅ Build audit log with ALL required fields
      const auditLog = {
        business_id: businessId,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        action: 'UPDATE_STAY_DETAILS',
        details: changes,
        description: `Updated stay details for guest ${guestName}`,
        booking_id: bookingId,
        guest_name: guestName,  // ✅ Now supported
        ip_address: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown',
        user_agent: event.headers['user-agent'] || 'unknown',
        created_at: new Date().toISOString()
      };

      console.log('📝 Audit log:', JSON.stringify(auditLog, null, 2));

      // ✅ Call create-audit-log function (preferred) or direct insert
      const auditResponse = await fetch(
        `${process.env.URL || 'https://fastcheckin.netlify.app'}/.netlify/functions/create-audit-log`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(auditLog)
        }
      );

      if (auditResponse.ok) {
        const auditResult = await auditResponse.json();
        console.log('✅ Audit log created:', auditResult.log?.id || 'success');
      } else {
        // ✅ Fallback: Direct insert if create-audit-log fails
        console.warn('⚠️ create-audit-log failed, trying direct insert...');
        
        const directResponse = await fetch(
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

        if (directResponse.ok) {
          console.log('✅ Audit log created (direct insert)');
        } else {
          const directError = await directResponse.text();
          console.warn('⚠️ Direct insert also failed:', directError);
        }
      }
    } catch (auditError) {
      console.warn('⚠️ Audit log error (non-critical):', auditError);
      // Don't fail the request if audit logging fails
    }

    // ============================================================
    // ✅ 5. RETURN SUCCESS RESPONSE
    // ============================================================
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
