import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export const handler = async (event) => {
  console.log(`📊 Request received at ${new Date().toISOString()}`);
  
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
    console.log('📝 Received booking data:', {
      business_id: body.business_id,
      guest_name: body.guest_name,
      guest_email: body.guest_email,
      check_in_date: body.check_in_date
    });

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

    const BOOKINGS_TABLE = 'bookings';

    // Clean names - Remove titles
    const cleanName = (name) => {
      if (!name) return '';
      const titlePattern = /^(Mr\.?|Mrs\.?|Ms\.?|Miss\.?|Dr\.?|Prof\.?|Rev\.?)\s+/i;
      return name.replace(titlePattern, '').trim();
    };

    let firstName = body.guest_first_name || '';
    let lastName = body.guest_last_name || '';
    let guestName = body.guest_name || '';

    firstName = cleanName(firstName);
    lastName = cleanName(lastName);
    
    if (guestName && !firstName && !lastName) {
      guestName = cleanName(guestName);
      const nameParts = guestName.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const bookingData = {
      business_id: body.business_id,
      guest_name: fullName || guestName,
      guest_first_name: firstName,
      guest_last_name: lastName,
      guest_email: (body.guest_email || '').toLowerCase().trim(),
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

    // Remove empty strings to avoid database errors
    Object.keys(bookingData).forEach(key => {
      if (bookingData[key] === '') {
        delete bookingData[key];
      }
    });

    console.log('💾 Saving booking to database...');

    // Insert the booking
    const { data: newBooking, error: insertError } = await supabase
      .from(BOOKINGS_TABLE)
      .insert([bookingData])
      .select();

    if (insertError) {
      console.error('❌ Supabase insert error:', insertError);
      
      // Check if table exists
      if (insertError.message.includes('relation') && insertError.message.includes('does not exist')) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Database table not configured. Please contact support.',
            code: 'TABLE_NOT_FOUND'
          })
        };
      }
      
      // Check for duplicate key violation
      if (insertError.code === '23505') {
        console.log('⚠️ Duplicate key violation');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            duplicate: true,
            message: 'Duplicate booking - guest already checked in today',
            booking: null
          })
        };
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: insertError.message,
          code: insertError.code,
          details: 'Failed to save booking to database'
        })
      };
    }

    // Handle the response - could be array or single object
    const savedBooking = newBooking && newBooking.length > 0 ? newBooking[0] : newBooking;
    
    console.log('✅ Booking saved successfully:', savedBooking?.id);

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
