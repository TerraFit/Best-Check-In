// netlify/functions/save-food-restrictions.js
// ✅ COMPLETE: All dietary options including carnivore with audit logging

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
    const { bookingId, restrictions } = body;

    console.log('📥 Received save request:', { bookingId, restrictions });

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
    const currentBookingResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=id,guest_name,business_id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    let currentBooking = null;
    if (currentBookingResponse.ok) {
      const bookingData = await currentBookingResponse.json();
      currentBooking = bookingData[0];
    }

    // ============================================================
    // ✅ 2. GET CURRENT RESTRICTIONS FOR AUDIT LOG
    // ============================================================
    const currentRestrictionsResponse = await fetch(
      `${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${bookingId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    let currentRestrictions = null;
    if (currentRestrictionsResponse.ok) {
      const restrictionsData = await currentRestrictionsResponse.json();
      currentRestrictions = restrictionsData[0];
    }

    // ============================================================
    // ✅ 3. BUILD RESTRICTION DATA
    // ============================================================
    const restrictionData = {
      vegetarian: restrictions.vegetarian === true,
      vegan: restrictions.vegan === true,
      pescatarian: restrictions.pescatarian === true,
      halal: restrictions.halal === true,
      kosher: restrictions.kosher === true,
      gluten_free: restrictions.gluten_free === true,
      lactose_free: restrictions.lactose_free === true,
      nut_allergy: restrictions.nut_allergy === true,
      seafood_allergy: restrictions.seafood_allergy === true,
      diabetic: restrictions.diabetic === true,
      no_pork: restrictions.no_pork === true,
      carnivore: restrictions.carnivore === true,
      other: restrictions.other === true,
      other_text: restrictions.other_text || '',
      updated_at: new Date().toISOString()
    };

    console.log('💾 Saving restriction data:', JSON.stringify(restrictionData, null, 2));

    // ============================================================
    // ✅ 4. CHECK IF RESTRICTIONS EXIST
    // ============================================================
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${bookingId}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!checkResponse.ok) {
      console.error('❌ Check response error:', await checkResponse.text());
      throw new Error(`Check failed: ${checkResponse.status}`);
    }

    const existingData = await checkResponse.json();
    const existingId = existingData[0]?.id;

    let result;

    // ============================================================
    // ✅ 5. INSERT OR UPDATE
    // ============================================================
    if (existingId) {
      // UPDATE
      console.log('📝 Updating existing restrictions for:', bookingId);
      
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/booking_food_restrictions?id=eq.${existingId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(restrictionData)
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Update error:', errorText);
        throw new Error(`HTTP ${updateResponse.status}: ${errorText}`);
      }

      const updateData = await updateResponse.json();
      result = updateData[0];
      console.log('✅ Updated restrictions:', result);
    } else {
      // INSERT
      console.log('📝 Inserting new restrictions for:', bookingId);
      
      const insertResponse = await fetch(
        `${supabaseUrl}/rest/v1/booking_food_restrictions`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([{
            booking_id: bookingId,
            ...restrictionData,
            created_at: new Date().toISOString()
          }])
        }
      );

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        console.error('❌ Insert error:', errorText);
        throw new Error(`HTTP ${insertResponse.status}: ${errorText}`);
      }

      const insertData = await insertResponse.json();
      result = insertData[0];
      console.log('✅ Inserted restrictions:', result);
    }

    // ============================================================
    // ✅ 6. CREATE AUDIT LOG WITH CHANGES
    // ============================================================
    try {
      // Calculate what changed
      const changes = {};
      const fields = [
        'vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher',
        'gluten_free', 'lactose_free', 'nut_allergy', 'seafood_allergy',
        'diabetic', 'no_pork', 'carnivore', 'other'
      ];

      fields.forEach(field => {
        const oldValue = currentRestrictions ? currentRestrictions[field] : false;
        const newValue = restrictionData[field];
        if (oldValue !== newValue) {
          changes[field] = { from: oldValue, to: newValue };
        }
      });

      // Check other_text changes
      const oldOtherText = currentRestrictions?.other_text || '';
      const newOtherText = restrictionData.other_text || '';
      if (oldOtherText !== newOtherText) {
        changes.other_text = { from: oldOtherText, to: newOtherText };
      }

      // Only create audit log if there were changes
      if (Object.keys(changes).length > 0) {
        // Get user from auth header
        const authHeader = event.headers.authorization || '';
        let userId = 'unknown';
        let userName = 'Unknown User';

        try {
          const token = authHeader.replace('Bearer ', '');
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
          userId = decoded.sub || 'unknown';
          userName = decoded.user_metadata?.full_name || 
                     decoded.user_metadata?.name || 
                     decoded.user_metadata?.business_name ||
                     'Unknown User';
        } catch (tokenError) {
          console.warn('Could not extract user from token:', tokenError.message);
        }

        // Get guest name for description
        const guestName = currentBooking?.guest_name || 'Unknown Guest';

        const auditLog = {
          business_id: currentBooking?.business_id || 'unknown',
          user_id: userId,
          user_name: userName,
          action: 'UPDATE_FOOD_RESTRICTIONS',
          details: changes,
          description: `Updated food restrictions for guest ${guestName}`,
          booking_id: bookingId,
          ip_address: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown',
          user_agent: event.headers['user-agent'] || 'unknown',
          created_at: new Date().toISOString()
        };

        console.log('📝 Audit log:', auditLog);

        const auditResponse = await fetch(
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

        if (auditResponse.ok) {
          console.log('✅ Audit log created for food restrictions update');
        } else {
          const auditError = await auditResponse.text();
          console.warn('⚠️ Failed to create audit log:', auditError);
        }
      } else {
        console.log('ℹ️ No changes detected, skipping audit log');
      }
    } catch (auditError) {
      console.warn('⚠️ Audit log error (non-critical):', auditError);
      // Don't fail the request if audit logging fails
    }

    // ============================================================
    // ✅ 7. RETURN SUCCESS RESPONSE
    // ============================================================
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        restrictions: result,
        message: 'Food restrictions saved successfully'
      })
    };

  } catch (error) {
    console.error('❌ Error saving food restrictions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to save food restrictions' 
      })
    };
  }
};
