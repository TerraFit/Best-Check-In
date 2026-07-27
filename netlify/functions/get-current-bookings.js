// netlify/functions/get-current-bookings.js
// ✅ CORRECT: Returns current Checked-In and Stayover bookings

import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { businessId } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID is required' })
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const ACTIVE_STATUSES = ['Checked-In', 'Stayover'];
    const today = new Date().toISOString().split('T')[0];

    console.log(`📡 Fetching current bookings for business: ${businessId}`);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        guest_name,
        guest_first_name,
        guest_last_name,
        guest_email,
        guest_phone,
        guest_country,
        guest_province,
        guest_city,
        check_in_date,
        check_out_date,
        nights,
        adults,
        children,
        status,
        total_amount,
        room_id,
        rooms:room_id (
          room_number,
          room_name,
          room_type,
          floor,
          status
        )
      `)
      .eq('business_id', businessId)
      .in('status', ACTIVE_STATUSES)
      .gte('check_out_date', today)
      .order('check_in_date', { ascending: true });

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to fetch bookings',
          details: error.message
        })
      };
    }

    // Format response
    const bookings = (data || []).map(booking => ({
      ...booking,
      room_number: booking.rooms?.room_number || null,
      room_name: booking.rooms?.room_name || null,
      room_type: booking.rooms?.room_type || null,
      floor: booking.rooms?.floor || null,
      room_status: booking.rooms?.status || null
    }));

    console.log(`✅ Found ${bookings.length} current bookings`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        bookings: bookings,
        count: bookings.length,
        businessId: businessId
      })
    };

  } catch (error) {
    console.error('❌ Error in get-current-bookings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch current bookings'
      })
    };
  }
};
