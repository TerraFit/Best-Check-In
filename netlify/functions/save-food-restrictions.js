// netlify/functions/save-food-restrictions.js
// ✅ ADDED: Carnivore field support

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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // ✅ Prepare restrictions with all fields including carnivore
    const restrictionData = {
      vegetarian: restrictions.vegetarian || false,
      vegan: restrictions.vegan || false,
      pescatarian: restrictions.pescatarian || false,
      halal: restrictions.halal || false,
      kosher: restrictions.kosher || false,
      gluten_free: restrictions.gluten_free || false,
      lactose_free: restrictions.lactose_free || false,
      nut_allergy: restrictions.nut_allergy || false,
      seafood_allergy: restrictions.seafood_allergy || false,
      diabetic: restrictions.diabetic || false,
      no_pork: restrictions.no_pork || false,
      carnivore: restrictions.carnivore || false,  // ✅ NEW
      other: restrictions.other || false,
      other_text: restrictions.other_text || '',
      updated_at: new Date().toISOString()
    };

    // Check if restrictions exist
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

    const existingData = await checkResponse.json();
    const existingId = existingData[0]?.id;

    let result;

    if (existingId) {
      // Update
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
        throw new Error(`HTTP ${updateResponse.status}`);
      }

      const updateData = await updateResponse.json();
      result = updateData[0];
    } else {
      // Insert
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
        throw new Error(`HTTP ${insertResponse.status}`);
      }

      const insertData = await insertResponse.json();
      result = insertData[0];
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
    console.error('Error saving food restrictions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Failed to save food restrictions' 
      })
    };
  }
};
