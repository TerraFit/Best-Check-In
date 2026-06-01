import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

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

  // ✅ CRITICAL FIX: Add WebSocket support for Node.js 20
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      realtime: { ws: ws },
      auth: { persistSession: false }
    }
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

    const normalizedEmail = email.toLowerCase().trim();
    
    // First, check if the table exists
    const { error: tableCheckError } = await supabase
      .from('guest_profiles')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.message.includes('relation') && tableCheckError.message.includes('does not exist')) {
      console.warn('⚠️ guest_profiles table does not exist yet');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          profile: null,
          message: 'Profile system not yet available' 
        })
      };
    }

    // Query the profile
    const { data, error } = await supabase
      .from('guest_profiles')
      .select('full_name, first_name, last_name, phone, passport_or_id, country, city, province, total_visits, last_visit_date')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('❌ Database error:', error.message);
      
      // If columns are missing, try with minimal fields
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.warn('⚠️ Some columns missing, trying with basic fields');
        
        const { data: basicData, error: basicError } = await supabase
          .from('guest_profiles')
          .select('full_name, phone')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (!basicError && basicData) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              profile: {
                full_name: basicData.full_name || '',
                first_name: '',
                last_name: '',
                phone: basicData.phone || '',
                passport_or_id: '',
                country: '',
                city: '',
                province: '',
                total_visits: 0,
                last_visit_date: null
              },
              message: 'Profile found (limited data)'
            })
          };
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          profile: null,
          message: 'Database error, but continuing' 
        })
      };
    }

    if (!data) {
      console.log('ℹ️ No profile found for email:', normalizedEmail);
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

    console.log('✅ Guest profile found for:', normalizedEmail);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        profile: {
          full_name: data.full_name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          passport_or_id: data.passport_or_id || '',
          country: data.country || '',
          city: data.city || '',
          province: data.province || '',
          total_visits: data.total_visits || 0,
          last_visit_date: data.last_visit_date || null
        }
      })
    };

  } catch (error) {
    console.error('❌ Error loading guest profile:', error);
    // Return 200 with null profile instead of 500 to prevent frontend crashes
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        profile: null,
        message: 'Service temporarily unavailable' 
      })
    };
  }
};
