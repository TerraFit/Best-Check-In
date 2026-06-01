// netlify/functions/create-booking.js - DEBUG VERSION

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export const handler = async (event) => {
  console.log(`📊 create-booking called at ${new Date().toISOString()}`);
  
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
    console.log('📝 Parsed body:', JSON.stringify(body, null, 2));

    if (!body.business_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing business_id' })
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

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        realtime: { ws: ws },
        auth: { persistSession: false }
      }
    );

    // Prepare booking data - ONLY include fields that exist in the table
    const bookingData = {
      business_id: body.business_id,
      guest_name: body.guest_name || `${body.guest_first_name || ''} ${body.guest_last_name || ''}`.trim(),
      guest_first_name: body.guest_first_name || '',
      guest_last_name: body.guest_last_name || '',
      guest_email: body.guest_email ? body.guest_email.toLowerCase().trim() : '',
      guest_phone: body.guest_phone || '',
      guest_id_number: body.guest_id_number || '',
      guest_id_photo: body.guest_id_photo || '',
      guest_signature: body.guest_signature || '',
      check_in_date: body.check_in_date || new Date().toISOString().split('T')[0],
      check_out_date: body.check_out_date || null,
      nights: body.nights || 1,
      adults: body.adults || 1,
      children: body.children || 0,
      total_amount: body.total_amount || 0,
      status: body.status || 'checked_in',
      guest_province: body.guest_province || '',
      guest_city: body.guest_city || '',
      guest_country: body.guest_country || 'South Africa',
      booking_source: body.booking_source || body.referral_source || '',
      referral_source: body.referral_source || body.booking_source || '',
      marketing_consent: body.marketing_consent || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Remove undefined/null/empty fields that might cause issues
    const cleanData = {};
    Object.keys(bookingData).forEach(key => {
      if (bookingData[key] !== undefined && bookingData[key] !== null && bookingData[key] !== '') {
        cleanData[key] = bookingData[key];
      }
    });

    console.log('💾 Clean booking data:', JSON.stringify(cleanData, null, 2));

    // Try a simple insert first
    const { data, error } = await supabase
      .from('bookings')
      .insert([cleanData])
      .select();

    if (error) {
      console.error('❌ Insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
      };
    }

    const savedBooking = data && data.length > 0 ? data[0] : data;
    console.log('✅ Booking saved:', savedBooking?.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        duplicate: false,
        booking: savedBooking,
        message: 'Booking created successfully'
      })
    };

  } catch (err) {
    console.error('❌ Fatal error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message,
        stack: err.stack
      })
    };
  }
};
