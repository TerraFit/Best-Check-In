import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

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
    const { email, profileData } = JSON.parse(event.body);

    console.log('📝 Saving guest profile for email:', email);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    // Prepare profile data with all possible fields
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

    // Remove undefined fields
    Object.keys(profileToSave).forEach(key => {
      if (profileToSave[key] === undefined || profileToSave[key] === '') {
        delete profileToSave[key];
      }
    });

    console.log('📦 Profile data to save:', Object.keys(profileToSave));

    // First, check if table exists and get its columns
    const { data: tableInfo, error: tableError } = await supabase
      .from('guest_profiles')
      .select('*')
      .limit(1);

    if (tableError && tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
      console.error('❌ guest_profiles table does not exist!');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Database table not configured. Please contact support.',
          code: 'TABLE_NOT_FOUND'
        })
      };
    }

    // Try full profile save first
    const { data, error } = await supabase
      .from('guest_profiles')
      .upsert(profileToSave, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Database error:', error.message);
      
      // If column doesn't exist, try with only existing columns
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('⚠️ Some columns missing, trying with minimal data...');
        
        const minimalProfile = {
          email: email.toLowerCase().trim(),
          full_name: profileData.fullName || '',
          phone: profileData.phone || '',
          country: profileData.country || '',
          updated_at: new Date().toISOString()
        };
        
        const { data: minimalData, error: minimalError } = await supabase
          .from('guest_profiles')
          .upsert(minimalProfile, {
            onConflict: 'email',
            ignoreDuplicates: false
          })
          .select();
          
        if (minimalError) {
          console.error('❌ Minimal save also failed:', minimalError.message);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Failed to save profile: ' + minimalError.message,
              code: 'SAVE_FAILED'
            })
          };
        }
        
        console.log('✅ Guest profile saved (minimal data):', minimalData);
        
        // Try to update visit count separately if possible
        try {
          await supabase
            .rpc('increment_guest_visits', { guest_email: email.toLowerCase().trim() })
            .catch(() => console.log('⚠️ Could not update visit count'));
        } catch (e) {
          console.log('⚠️ Visit count update skipped:', e.message);
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Profile saved successfully (limited fields)',
            profile: minimalData,
            note: 'Some fields were not saved due to database schema'
          })
        };
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: error.message,
          code: 'DATABASE_ERROR'
        })
      };
    }

    console.log('✅ Guest profile saved:', data);
    
    // Update visit count (non-critical, don't block on error)
    try {
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
        console.log('✅ Visit count updated');
      }
    } catch (visitError) {
      console.warn('⚠️ Could not update visit count:', visitError.message);
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
        error: error.message || 'Internal server error',
        code: 'UNHANDLED_ERROR'
      })
    };
  }
};
