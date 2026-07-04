// netlify/functions/get-booking-details.js

export const handler = async function(event) {
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
    const { bookingId } = event.queryStringParameters || {};
    
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

    // Fetch booking details
    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const booking = data[0];

    if (!booking) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Booking not found' })
      };
    }

    // Fetch food restrictions if they exist
    let foodRestrictions = null;
    try {
      const restrictionsResponse = await fetch(
        `${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${bookingId}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (restrictionsResponse.ok) {
        const restrictionsData = await restrictionsResponse.json();
        if (restrictionsData && restrictionsData.length > 0) {
          foodRestrictions = restrictionsData[0];
        }
      }
    } catch (err) {
      console.warn('Could not fetch food restrictions:', err.message);
    }

    const guestDetails = {
      id: booking.id,
      guest_name: booking.guest_name || '',
      guest_first_name: booking.guest_first_name || '',
      guest_last_name: booking.guest_last_name || '',
      guest_email: booking.guest_email || '',
      guest_phone: booking.guest_phone || '',
      guest_country: booking.guest_country || '',
      guest_province: booking.guest_province || '',
      guest_city: booking.guest_city || '',
      arriving_from: booking.arriving_from || '',
      guests: (booking.adults || 0) + (booking.children || 0),
      adults: booking.adults || 0,
      children: booking.children || 0,
      check_in_date: booking.check_in_date || '',
      check_out_date: booking.check_out_date || '',
      nights: booking.nights || 1,
      booking_reference: booking.id,
      booking_source: booking.booking_source || '',
      referral_source: booking.referral_source || '',
      food_restrictions: foodRestrictions,
      created_at: booking.created_at,
      updated_at: booking.updated_at
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(guestDetails)
    };

  } catch (error) {
    console.error('Error fetching booking details:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Failed to fetch booking details' 
      })
    };
  }
};
