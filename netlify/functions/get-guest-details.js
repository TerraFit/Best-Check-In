// netlify/functions/get-guest-details.js
// ✅ Fetches guest details including food restrictions

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

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
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: {
          transport: WebSocket
        }
      }
    );

    const { bookingId, businessId } = event.queryStringParameters || {};

    if (!bookingId) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Booking ID required' }) 
      };
    }

    // ✅ Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Booking fetch error:', bookingError);
      return { 
        statusCode: 404, 
        headers, 
        body: JSON.stringify({ error: 'Booking not found' }) 
      };
    }

    // ✅ Fetch food restrictions
    const { data: restrictions, error: restrictionsError } = await supabase
      .from('booking_food_restrictions')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (restrictionsError && restrictionsError.code !== 'PGRST116') {
      console.error('Restrictions fetch error:', restrictionsError);
    }

    // ✅ Combine data - FIXED guests calculation
    const guestDetails = {
      id: booking.id,
      guest_name: booking.guest_name || '',
      guest_first_name: booking.guest_first_name || '',
      guest_last_name: booking.guest_last_name || '',
      guest_email: booking.guest_email || '',
      guest_phone: booking.guest_phone || '',
      guest_country: booking.guest_country || '',
      arriving_from: booking.arriving_from || '',
      guests: (booking.adults || 0) + (booking.children || 0),  // ✅ FIXED
      adults: booking.adults || 0,
      children: booking.children || 0,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date || '',
      booking_reference: booking.id.substring(0, 8).toUpperCase(),
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
