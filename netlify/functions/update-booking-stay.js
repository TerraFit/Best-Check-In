// netlify/functions/update-booking-stay.js
// ✅ Update check-in/out dates and nights

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

    // Build update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (check_in_date) updateData.check_in_date = check_in_date;
    if (check_out_date) updateData.check_out_date = check_out_date;
    if (nights !== undefined && nights !== null) updateData.nights = nights;

    console.log('📝 Update data:', updateData);

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        booking: updatedBooking,
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
