// netlify/functions/get-guest-profile.js
import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method Not Allowed' 
      })
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { email } = event.queryStringParameters || {};

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Email is required' 
        })
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid email format' 
        })
      };
    }

    console.log(`🔍 Fetching guest profile for email: ${email}`);

    // First try to get from guest_profiles
    let { data: profile, error } = await supabase
      .from('guest_profiles')
      .select(`
        id,
        email,
        full_name,
        first_name,
        last_name,
        phone,
        passport_or_id,
        country,
        city,
        province,
        total_visits,
        last_visit_date,
        created_at,
        updated_at
      `)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Database error occurred',
          details: error.message 
        })
      };
    }

    // If no profile found, also try to get from previous bookings as fallback
    if (!profile) {
      console.log(`ℹ️ No profile found, checking bookings for email: ${email}`);
      
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('guest_name, guest_first_name, guest_last_name, guest_phone, guest_id_number, guest_country, guest_city, guest_province')
        .eq('guest_email', email.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!bookingError && bookings && bookings.length > 0) {
        const lastBooking = bookings[0];
        console.log('✅ Found previous booking, creating profile from it');
        
        // Parse name from guest_name if first/last not available
        let firstName = lastBooking.guest_first_name || '';
        let lastName = lastBooking.guest_last_name || '';
        
        if (!firstName && !lastName && lastBooking.guest_name) {
          const nameParts = lastBooking.guest_name.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        profile = {
          full_name: lastBooking.guest_name,
          first_name: firstName,
          last_name: lastName,
          phone: lastBooking.guest_phone,
          passport_or_id: lastBooking.guest_id_number,
          country: lastBooking.guest_country,
          city: lastBooking.guest_city,
          province: lastBooking.guest_province
        };
      }
    }

    if (profile) {
      console.log(`✅ Guest profile found for ${email}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          profile: {
            full_name: profile.full_name || '',
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone || '',
            passport_or_id: profile.passport_or_id || '',
            country: profile.country || '',
            city: profile.city || '',
            province: profile.province || '',
            total_visits: profile.total_visits || 0,
            last_visit_date: profile.last_visit_date || null
          }
        })
      };
    }

    console.log(`ℹ️ No guest profile found for ${email}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        profile: null,
        message: 'No profile found for this email'
      })
    };

  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
