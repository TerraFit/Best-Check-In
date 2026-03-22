import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const bookingData = JSON.parse(event.body);
    console.log('📝 Saving booking:', bookingData);

    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select();

    if (error) {
      console.error('❌ Error saving booking:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    console.log('✅ Booking saved:', data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, booking: data })
    };

  } catch (error) {
    console.error('🔥 Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
