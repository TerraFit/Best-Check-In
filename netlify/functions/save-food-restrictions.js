// netlify/functions/save-food-restrictions.js

export const handler = async function(event) {
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
    const { booking_id, ...restrictionData } = body;

    if (!booking_id) {
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

    // Check if restrictions already exist
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${booking_id}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    const existing = await checkResponse.json();
    const existingId = existing[0]?.id;

    let result;

    if (existingId) {
      // Update existing
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
          body: JSON.stringify({
            ...restrictionData,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Update error:', errorText);
        throw new Error(`HTTP ${updateResponse.status}: ${errorText}`);
      }

      const updateData = await updateResponse.json();
      result = updateData[0];
    } else {
      // Insert new
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
            booking_id,
            ...restrictionData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
        }
      );

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        console.error('Insert error:', errorText);
        throw new Error(`HTTP ${insertResponse.status}: ${errorText}`);
      }

      const insertData = await insertResponse.json();
      result = insertData[0];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
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
