// netlify/functions/get-guest-profile.js

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight
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
    
    console.log('🔍 Loading guest profile for email:', email);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    // Validate Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return {
        statusCode: 200, // Return 200 with null profile to prevent frontend crash
        headers,
        body: JSON.stringify({ 
          success: true, 
          profile: null,
          message: 'Profile service temporarily unavailable' 
        })
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Create Supabase client with WebSocket support
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        realtime: { ws: ws },
        auth: { persistSession: false }
      }
    );

    // First, check if the table exists by trying a simple query
    try {
      // Query the profile
      const { data, error } = await supabase
        .from('guest_profiles')
        .select('full_name, first_name, last_name, phone, passport_or_id, country, city, province, total_visits, last_visit_date')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) {
        console.error('❌ Database error:', error.message);
        
        // If the table doesn't exist, return null profile gracefully
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
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
        
        // For other errors, still return 200 with null profile
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            profile: null,
            message: 'Database query failed, but continuing' 
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

    } catch (dbError) {
      console.error('❌ Database connection error:', dbError);
      return {
        statusCode: 200, // Return 200 to prevent frontend crash
        headers,
        body: JSON.stringify({ 
          success: true, 
          profile: null,
          message: 'Database temporarily unavailable' 
        })
      };
    }

  } catch (error) {
    console.error('❌ Unhandled error in get-guest-profile:', error);
    // Always return 200 with null profile to prevent frontend from breaking
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
