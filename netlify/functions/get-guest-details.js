// netlify/functions/get-guest-details.js
// ✅ Includes optional room fields (Phase 1)

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

    const bookingResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!bookingResponse.ok) {
      const errorText = await bookingResponse.text();
      console.error('Booking fetch error:', errorText);
      return { 
        statusCode: 404, 
        headers, 
        body: JSON.stringify({ error: 'Booking not found' }) 
      };
    }

    const bookingData = await bookingResponse.json();
    const booking = bookingData[0];

    if (!booking) {
      return { 
        statusCode: 404, 
        headers, 
        body: JSON.stringify({ error: 'Booking not found' }) 
      };
    }

    let restrictions = null;
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
          restrictions = restrictionsData[0];
        }
      }
    } catch (err) {
      console.warn('Could not fetch food restrictions:', err.message);
    }

    const guestDetails = {
      id: booking.id,
      business_id: booking.business_id || null,
      guest_name: booking.guest_name || '',
      guest_first_name: booking.guest_first_name || '',
      guest_last_name: booking.guest_last_name || '',
      guest_email: booking.guest_email || '',
      guest_phone: booking.guest_phone || '',
      guest_country: booking.guest_country || '',
      arriving_from: booking.arriving_from || '',
      next_destination: booking.next_destination || '',
      guests: (booking.adults || 0) + (booking.children || 0),
      adults: booking.adults || 0,
      children: booking.children || 0,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date || '',
      nights: booking.nights || 1,
      booking_reference: booking.id.substring(0, 8).toUpperCase(),
      room_id: booking.room_id || null,
      room_number: booking.room_number ?? null,
      room_name: booking.room_name || null,
      food_restrictions: restrictions || {
        vegetarian: false,
        vegan: false,
        pescatarian: false,
        halal: false,
        kosher: false,
        gluten_free: false,
        lactose_free: false,
        nut_allergy: false,
        seafood_allergy: false,
        diabetic: false,
        no_pork: false,
        other: false,
        other_text: ''
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(guestDetails)
    };

  } catch (error) {
    console.error('Error fetching guest details:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch guest details',
        details: error.message 
      })
    };
  }
};
