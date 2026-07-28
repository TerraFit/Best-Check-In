// netlify/functions/get-guest-details.js
// ✅ FIXED: Use 'marketing_consent' instead of 'popia_consent'

export const handler = async (event) => {
  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { bookingId } = event.queryStringParameters || {};

    if (!bookingId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Booking ID is required'
        })
      };
    }

    console.log(`📡 Fetching guest details for booking: ${bookingId}`);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Server configuration error'
        })
      };
    }

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // ✅ FIXED: Use 'marketing_consent' (not 'popia_consent')
    const query = `bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,guest_name,guest_first_name,guest_last_name,guest_email,guest_phone,guest_country,guest_province,guest_city,check_in_date,check_out_date,nights,adults,children,status,total_amount,room_id,booking_source,referral_source,arriving_from,next_destination,marketing_consent,created_at,rooms:room_id(room_number,room_name,room_type,floor,status)`;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Guest details API error: ${response.status} - ${errorText}`);
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: `Guest details API error: ${response.status}`,
          details: errorText
        })
      };
    }

    const bookings = await response.json();
    
    if (!bookings || bookings.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Booking not found'
        })
      };
    }

    const booking = bookings[0];

    const roomInfo = booking.rooms || {};
    const guestDetails = {
      id: booking.id,
      guest_name: booking.guest_name,
      guest_first_name: booking.guest_first_name,
      guest_last_name: booking.guest_last_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone,
      guest_country: booking.guest_country,
      guest_province: booking.guest_province,
      guest_city: booking.guest_city,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      status: booking.status,
      total_amount: booking.total_amount,
      room_id: booking.room_id,
      room_number: roomInfo.room_number || null,
      room_name: roomInfo.room_name || null,
      room_type: roomInfo.room_type || null,
      floor: roomInfo.floor || null,
      room_status: roomInfo.status || null,
      booking_source: booking.booking_source,
      referral_source: booking.referral_source,
      arriving_from: booking.arriving_from,
      next_destination: booking.next_destination,
      marketing_consent: booking.marketing_consent, // ✅ FIXED: Use correct column name
      created_at: booking.created_at
    };

    console.log(`✅ Guest details retrieved for ${guestDetails.guest_name}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        guest: guestDetails
      })
    };

  } catch (error) {
    console.error('❌ Unhandled error in get-guest-details:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        stack: error.stack
      })
    };
  }
};
