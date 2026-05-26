import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const email = event.queryStringParameters?.email;
    
    console.log('🔍 Loading guest profile for email:', email);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    const { data, error } = await supabase
      .from('guest_profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error('❌ Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    if (!data) {
      console.log('ℹ️ No profile found for email:', email);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          profile: null,
          message: 'No profile found' 
        })
      };
    }

    console.log('✅ Guest profile found:', data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        profile: {
          full_name: data.full_name,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          passport_or_id: data.passport_or_id,
          country: data.country,
          city: data.city,
          province: data.province,
          total_visits: data.total_visits,
          last_visit_date: data.last_visit_date
        }
      })
    };

  } catch (error) {
    console.error('❌ Error loading guest profile:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
};
