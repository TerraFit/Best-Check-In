// netlify/functions/create-indemnity-record.ts
// Production: persist signed indemnity and return a UUID access_token

import { Handler } from '@netlify/functions';
import { randomUUID } from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      booking_id,
      business_id,
      guest_name,
      guest_first_name,
      guest_last_name,
      passport_or_id,
      signature_data,
      guest_signature,
      indemnity_text,
      signed_at
    } = body;

    if (!booking_id || !business_id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'booking_id and business_id are required'
        })
      };
    }

    if (!signature_data && !guest_signature) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'signature_data is required'
        })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Server configuration error'
        })
      };
    }

    const accessToken = randomUUID();
    const resolvedSignature = signature_data || guest_signature || null;
    const ipAddress =
      event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      event.headers['client-ip'] ||
      event.headers['x-nf-client-connection-ip'] ||
      null;
    const userAgent = event.headers['user-agent'] || null;

    const record: Record<string, unknown> = {
      booking_id,
      business_id,
      guest_name: guest_name || null,
      guest_first_name: guest_first_name || null,
      guest_last_name: guest_last_name || null,
      passport_or_id: passport_or_id || null,
      signature_data: resolvedSignature,
      guest_signature: guest_signature || resolvedSignature,
      indemnity_text: indemnity_text || null,
      signed_at: signed_at || new Date().toISOString(),
      access_token: accessToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    };

    console.log('💾 Inserting indemnity_records for booking:', booking_id);

    const response = await fetch(`${supabaseUrl}/rest/v1/indemnity_records`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify([record])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to insert indemnity_records:', response.status, errorText);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Failed to persist indemnity record',
          details: errorText.substring(0, 300)
        })
      };
    }

    const inserted = await response.json();
    const saved = Array.isArray(inserted) ? inserted[0] : inserted;
    const returnedToken = saved?.access_token || accessToken;

    console.log('✅ Indemnity record saved for booking:', booking_id, 'token:', returnedToken);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        access_token: returnedToken
      })
    };
  } catch (error) {
    console.error('❌ create-indemnity-record error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};
