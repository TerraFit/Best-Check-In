// netlify/functions/update-food-restrictions.js
// ✅ Updates food restrictions for a booking

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

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
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: {
          transport: WebSocket
        }
      }
    );

    const { bookingId, restrictions } = JSON.parse(event.body);

    if (!bookingId) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Booking ID required' }) 
      };
    }

    if (!restrictions || typeof restrictions !== 'object') {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Restrictions data required' }) 
      };
    }

    // ✅ Check if restrictions exist
    const { data: existing, error: checkError } = await supabase
      .from('booking_food_restrictions')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    let result;

    if (existing) {
      // ✅ Update existing
      const { data, error } = await supabase
        .from('booking_food_restrictions')
        .update({
          ...restrictions,
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // ✅ Insert new
      const { data, error } = await supabase
        .from('booking_food_restrictions')
        .insert({
          booking_id: bookingId,
          ...restrictions
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        restrictions: result 
      })
    };

  } catch (error) {
    console.error('Error updating food restrictions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update food restrictions',
        details: error.message 
      })
    };
  }
};
