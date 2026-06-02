// netlify/functions/create-indemnity-record.ts - COMPLETE REST REPLACEMENT
// DELETE the old version and use this

import { Handler } from '@netlify/functions';
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

    // Remove undefined values
    Object.keys(indemnityRecord).forEach(key => {
      if (indemnityRecord[key] === undefined) {
        delete indemnityRecord[key];
      }
    });

    console.log('📝 Creating indemnity record for booking:', booking_id);
    console.log('📝 Guest:', guest_name);
    console.log('📝 Access token generated:', accessToken.substring(0, 16) + '...');

    // REST API call - NO Supabase client, NO WebSocket
    const response = await fetch(`${supabaseUrl}/rest/v1/indemnity_records`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([indemnityRecord])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Insert error:', response.status, errorText);
      
      // Check if it's a duplicate (PG error code 23505)
      if (errorText.includes('23505')) {
        console.warn('⚠️ Indemnity record already exists for booking:', booking_id);
        
        // Try to fetch existing record
        const fetchResponse = await fetch(
          `${supabaseUrl}/rest/v1/indemnity_records?booking_id=eq.${booking_id}&select=access_token`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Accept': 'application/json'
            }
          }
        );
        
        if (fetchResponse.ok) {
          const existing = await fetchResponse.json();
          if (existing && existing.length > 0) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ 
                success: true, 
                access_token: existing[0].access_token,
                message: 'Existing indemnity record found'
              })
            };
          }
        }
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to save indemnity record',
          details: errorText
        })
      };
    }

    const result = await response.json();
    const savedRecord = result && result[0];
    
    console.log('✅ Indemnity record saved successfully:', savedRecord?.id);
    console.log('✅ Access token:', accessToken);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        access_token: accessToken,
        indemnity_id: savedRecord?.id,
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
