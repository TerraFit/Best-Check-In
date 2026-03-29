import { createClient } from '@supabase/supabase-js';

// ✅ FIXED: Use your actual Netlify env var name
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Basic auth check
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - Missing auth token' })
    };
  }

  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.business_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing business_id' })
      };
    }

    if (!body.guest_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing guest_name' })
      };
    }

    // Force status to checked_in - backend is source of truth
    const bookingData = {
      business_id: body.business_id,
      guest_name: body.guest_name,
      guest_email: body.guest_email || '',
      guest_phone: body.guest_phone || '',
      guest_id_number: body.guest_id_number || '',
      guest_id_photo: body.guest_id_photo || '',
      guest_signature: body.guest_signature || '',
      check_in_date: body.check_in_date || new Date().toISOString().split('T')[0],
      check_out_date: body.check_out_date || '',
      nights: body.nights || 1,
      adults: body.adults || 1,
      children: body.children || 0,
      total_amount: body.total_amount || 0,
      status: 'checked_in',
      guest_province: body.guest_province || '',
      guest_city: body.guest_city || '',
      guest_country: body.guest_country || 'South Africa',
      marketing_consent: body.marketing_consent || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Saving booking:', {
      business_id: bookingData.business_id,
      guest_name: bookingData.guest_name,
      status: bookingData.status,
      check_in_date: bookingData.check_in_date
    });

    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    console.log('✅ Booking saved successfully:', data[0]?.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        booking: data[0],
        message: 'Booking created successfully'
      })
    };
  } catch (err) {
    console.error('❌ create-booking error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Internal Server Error'
      })
    };
  }
};
