// netlify/functions/save-guest-profile.js

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export const handler = async function(event) {
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
    const { email, profileData } = body;

    console.log('📝 Saving guest profile for email:', email);

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
        statusCode: 200, // Return 200 to prevent frontend crash
        headers,
        body: JSON.stringify({ 
          success: true, 
          warning: 'Profile service not configured',
          message: 'Profile not saved, but check-in continues'
        })
      };
    }

    // Create Supabase client with WebSocket support
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        realtime: { ws: ws },
        auth: { persistSession: false }
      }
    );

    const normalizedEmail = email.toLowerCase().trim();
    
    // Prepare profile data
    const profileToSave = {
      email: normalizedEmail,
      full_name: profileData?.fullName || '',
      first_name: profileData?.firstName || '',
      last_name: profileData?.lastName || '',
      phone: profileData?.phone || '',
      passport_or_id: profileData?.passportOrId || '',
      country: profileData?.country || '',
      city: profileData?.city || '',
      province: profileData?.province || '',
      updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(profileToSave).forEach(key => {
      if (profileToSave[key] === undefined || profileToSave[key] === '') {
        delete profileToSave[key];
      }
    });

    console.log('📦 Saving profile:', Object.keys(profileToSave));

    // Try to get existing profile first
    const { data: existingProfile, error: fetchError } = await supabase
      .from('guest_profiles')
      .select('id, total_visits')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fetchError && !fetchError.message.includes('does not exist')) {
      console.error('❌ Error checking existing profile:', fetchError);
      // Continue anyway - try to upsert
    }

    // Increment visit count if profile exists
    const totalVisits = (existingProfile?.total_visits || 0) + 1;
    
    // Upsert the profile
    const { data, error } = await supabase
      .from('guest_profiles')
      .upsert({
        ...profileToSave,
        total_visits: totalVisits,
        last_visit_date: new Date().toISOString().split('T')[0]
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Database error:', error.message);
      
      // Check if table doesn't exist
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.warn('⚠️ guest_profiles table does not exist - skipping save');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            warning: 'Profile table not available',
            message: 'Profile not saved, but check-in continues'
          })
        };
      }
      
      // For other errors, still return success to not block check-in
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          warning: 'Profile save failed',
          message: 'Profile not saved, but check-in continues',
          error: error.message
        })
      };
    }

    console.log('✅ Guest profile saved/updated:', normalizedEmail);
    
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
    console.error('❌ Error saving guest profile:', error);
    // Always return 200 to prevent blocking the check-in
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        warning: 'Profile save error',
        message: 'Check-in continues, but profile not saved'
      })
    };
  }
};
