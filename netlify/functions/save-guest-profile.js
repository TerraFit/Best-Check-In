// netlify/functions/save-guest-profile.js - COMPLETE REST MIGRATION

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
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
    const { email, profileData } = body;

    console.log('📝 Saving guest profile for email:', email);

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
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          warning: 'Profile service not configured',
          message: 'Check-in continues'
        })
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Build full name from available data
    let fullName = '';
    if (profileData?.fullName) {
      fullName = profileData.fullName;
    } else if (profileData?.firstName || profileData?.lastName) {
      fullName = `${profileData?.firstName || ''} ${profileData?.lastName || ''}`.trim();
    }

    // First, check if profile exists to get current visit count
    let totalVisits = 1;
    try {
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/guest_profiles?email=eq.${encodeURIComponent(normalizedEmail)}&select=total_visits`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (checkResponse.ok) {
        const existing = await checkResponse.json();
        if (existing && existing.length > 0 && existing[0].total_visits) {
          totalVisits = existing[0].total_visits + 1;
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not check existing profile:', err.message);
      // Continue with totalVisits = 1
    }

    // Build profile object with ONLY fields that exist in your table
    const profileToSave = {
      email: normalizedEmail,
      full_name: fullName,
      phone: profileData?.phone || '',
      passport_or_id: profileData?.passportOrId || '',
      country: profileData?.country || '',
      city: profileData?.city || '',
      province: profileData?.province || '',
      total_visits: totalVisits,
      last_visit_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };

    // Remove undefined or empty values
    Object.keys(profileToSave).forEach(key => {
      if (profileToSave[key] === undefined || profileToSave[key] === '') {
        delete profileToSave[key];
      }
    });

    console.log('📦 Saving profile data:', Object.keys(profileToSave));

    // UPSERT using POST with conflict handling
    const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/guest_profiles`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(profileToSave)
    });

    if (!upsertResponse.ok) {
      const errorText = await upsertResponse.text();
      console.error('❌ Upsert failed:', upsertResponse.status, errorText);
      
      // Don't fail the check-in - just log the error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          warning: 'Profile save failed',
          message: 'Check-in continues',
          error: errorText
        })
      };
    }

    console.log('✅ Guest profile saved successfully for:', normalizedEmail);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Profile saved successfully'
      })
    };

  } catch (error) {
    console.error('❌ Unhandled error in save-guest-profile:', error);
    // ALWAYS return 200 - never block the check-in
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        warning: 'Profile save error',
        message: 'Check-in continues'
      })
    };
  }
};
