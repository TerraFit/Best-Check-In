// netlify/functions/get-guest-profile.js - COMPLETE REST VERSION
// DELETE the old file and replace with this

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
    const email = event.queryStringParameters?.email;
    console.log('🔍 Looking for email:', email);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, profile: null })
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // ✅ REST API call - only select columns that exist
    const response = await fetch(
      `${supabaseUrl}/rest/v1/guest_profiles?email=eq.${encodeURIComponent(normalizedEmail)}&select=full_name,phone,passport_or_id,country,city,province,total_visits,last_visit_date`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Supabase API error:', response.status);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, profile: null })
      };
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.log('No profile found for:', normalizedEmail);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, profile: null })
      };
    }

    const profile = data[0];
    console.log('✅ Found profile:', profile.email);

    // ✅ Split full_name into first_name and last_name for frontend
    let firstName = '';
    let lastName = '';
    if (profile.full_name) {
      const nameParts = profile.full_name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        profile: {
          full_name: profile.full_name || '',
          first_name: firstName,
          last_name: lastName,
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

  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, profile: null })
    };
  }
};
