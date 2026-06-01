import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import crypto from 'crypto';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
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
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const { 
      booking_id, 
      business_id, 
      guest_name, 
      guest_first_name, 
      guest_last_name, 
      passport_or_id, 
      signature_data 
    } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!booking_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing booking_id' })
      };
    }

    if (!business_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing business_id' })
      };
    }

    if (!guest_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing guest_name' })
      };
    }

    if (!signature_data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing signature_data' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // ✅ CRITICAL FIX: Create Supabase client with WebSocket support
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        realtime: { ws: ws },
        auth: { persistSession: false }
      }
    );

    // Generate a unique access token for the indemnity record
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Prepare indemnity record
    const indemnityRecord = {
      booking_id,
      business_id,
      guest_name: guest_name.trim(),
      guest_first_name: guest_first_name || '',
      guest_last_name: guest_last_name || '',
      passport_or_id: passport_or_id || '',
      signature_data,
      access_token: accessToken,
      signed_at: new Date().toISOString(),
      ip_address: event.headers['x-forwarded-for'] || 
                  event.headers['client-ip'] || 
                  event.headers['x-real-ip'] || 
                  'unknown',
      user_agent: event.headers['user-agent'] || 'unknown',
      created_at: new Date().toISOString()
    };

    console.log('📝 Creating indemnity record for booking:', booking_id);
    console.log('📝 Guest:', guest_name);
    console.log('📝 Access token generated:', accessToken.substring(0, 16) + '...');

    // Insert the indemnity record using Supabase client
    const { data, error } = await supabase
      .from('indemnity_records')
      .insert([indemnityRecord])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      
      // Check if table exists
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Indemnity records table not configured. Please contact support.',
            code: 'TABLE_NOT_FOUND'
          })
        };
      }
      
      // Check if it's a duplicate
      if (error.code === '23505') {
        console.warn('⚠️ Indemnity record already exists for booking:', booking_id);
        
        // Try to fetch existing record
        const { data: existing, error: fetchError } = await supabase
          .from('indemnity_records')
          .select('access_token')
          .eq('booking_id', booking_id)
          .single();
        
        if (!fetchError && existing) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              access_token: existing.access_token,
              message: 'Existing indemnity record found'
            })
          };
        }
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to save indemnity record',
          details: error.message
        })
      };
    }

    console.log('✅ Indemnity record saved successfully:', data?.id);
    console.log('✅ Access token:', accessToken);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        access_token: accessToken,
        indemnity_id: data?.id,
        message: 'Indemnity record created successfully'
      })
    };

  } catch (error) {
    console.error('❌ Error creating indemnity record:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }) 
    };
  }
};
