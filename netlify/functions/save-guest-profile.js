import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { email, profileData } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    // Save to guest_profiles table (you'll need to create this)
    const { data, error } = await supabase
      .from('guest_profiles')
      .upsert({
        email: email,
        full_name: profileData.fullName,
        phone: profileData.phone,
        passport_or_id: profileData.passportOrId,
        country: profileData.country,
        city: profileData.city,
        province: profileData.province,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select();

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Profile saved successfully',
        profile: data
      })
    };

  } catch (error) {
    console.error('Error saving guest profile:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
