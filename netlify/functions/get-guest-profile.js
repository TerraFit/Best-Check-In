import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
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

  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get email from query parameters
    const { email } = event.queryStringParameters || {};

    // Validate email
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

    // Validate email format
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

    // Query the guest_profiles table
    const { data: profile, error } = await supabase
      .from('guest_profiles')
      .select(`
        id,
        email,
        full_name,
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
      .maybeSingle(); // Returns null if no match, instead of error

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

    // If profile found, return it
    if (profile) {
      console.log(`✅ Guest profile found for ${email}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          profile: {
            full_name: profile.full_name,
            phone: profile.phone,
            passport_or_id: profile.passport_or_id,
            country: profile.country,
            city: profile.city,
            province: profile.province,
            total_visits: profile.total_visits,
            last_visit_date: profile.last_visit_date
          }
        })
      };
    }

    // No profile found
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
