// netlify/functions/save-food-restrictions.js
// ✅ COMPLETE: All dietary options including carnivore

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

    // ✅ Build restriction data with ALL fields including carnivore
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
      carnivore: restrictions.carnivore === true,  // ✅ NOW WORKS
      other: restrictions.other === true,
      other_text: restrictions.other_text || '',
      updated_at: new Date().toISOString()
    };

    console.log('💾 Saving data:', JSON.stringify(restrictionData, null, 2));

    // Check if restrictions already exist
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
      console.error('❌ Check error:', await checkResponse.text());
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to check existing restrictions' })
      };
    }

    const existingData = await checkResponse.json();
    const existingId = existingData[0]?.id;

    let result;

    if (existingId) {
      // ✅ UPDATE
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
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `Update failed: ${errorText}` })
        };
      }

      const updateData = await updateResponse.json();
      result = updateData[0];
      console.log('✅ Updated restrictions:', result);
    } else {
      // ✅ INSERT
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
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `Insert failed: ${errorText}` })
        };
      }

      const insertData = await insertResponse.json();
      result = insertData[0];
      console.log('✅ Inserted restrictions:', result);
    }

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
