// netlify/functions/save-guest-profile.js
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

    console.log('📝 Saving guest profile for email:', email);
    console.log('📝 Profile data:', profileData);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    // Prepare the profile object - only include fields that exist in the table
    const profileToSave = {
      email: email.toLowerCase().trim(),
      full_name: profileData.fullName || '',
      first_name: profileData.firstName || '',
      last_name: profileData.lastName || '',
      phone: profileData.phone || '',
      passport_or_id: profileData.passportOrId || '',
      country: profileData.country || '',
      city: profileData.city || '',
      province: profileData.province || '',
      updated_at: new Date().toISOString()
    };

    // Try to upsert (insert or update)
    const { data, error } = await supabase
      .from('guest_profiles')
      .upsert(profileToSave, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      
      // If the table doesn't have first_name/last_name columns, try without them
      if (error.message.includes('column') && (error.message.includes('first_name') || error.message.includes('last_name'))) {
        console.log('⚠️ Trying simplified profile save without first_name/last_name');
        
        const simplifiedProfile = {
          email: email.toLowerCase().trim(),
          full_name: profileData.fullName || '',
          phone: profileData.phone || '',
          passport_or_id: profileData.passportOrId || '',
          country: profileData.country || '',
          city: profileData.city || '',
          province: profileData.province || '',
          updated_at: new Date().toISOString()
        };
        
        const { data: simplifiedData, error: simplifiedError } = await supabase
          .from('guest_profiles')
          .upsert(simplifiedProfile, {
            onConflict: 'email',
            ignoreDuplicates: false
          })
          .select();
          
        if (simplifiedError) {
          console.error('❌ Simplified save also failed:', simplifiedError);
          throw simplifiedError;
        }
        
        console.log('✅ Guest profile saved (simplified):', simplifiedData);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Profile saved successfully',
            profile: simplifiedData
          })
        };
      }
      
      throw error;
    }

    console.log('✅ Guest profile saved:', data);
    
    // Also update total_visits count for this guest
    const { data: existingProfile } = await supabase
      .from('guest_profiles')
      .select('total_visits')
      .eq('email', email.toLowerCase().trim())
      .single();
    
    if (existingProfile) {
      await supabase
        .from('guest_profiles')
        .update({ 
          total_visits: (existingProfile.total_visits || 0) + 1,
          last_visit_date: new Date().toISOString().split('T')[0]
        })
        .eq('email', email.toLowerCase().trim());
    }

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
