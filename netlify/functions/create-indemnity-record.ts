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

/** TEMP diagnostic: redact large base64 signature fields for log safety */
function redactSignatures<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const key of ['signature_data', 'guest_signature', 'signature']) {
    const v = out[key];
    if (typeof v === 'string' && v.length > 80) {
      out[key] = `[redacted base64 length=${v.length}]`;
    }
  }
  return out as T;
}

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

    // TEMP DIAG: 1) incoming request payload (signatures redacted)
    console.log('[DIAG create-indemnity-record] 1) incoming payload:', JSON.stringify(redactSignatures(body as Record<string, unknown>)));

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

    // TEMP DIAG: 2) exact record object POSTed (signatures redacted)
    console.log('[DIAG create-indemnity-record] 2) record to POST:', JSON.stringify(redactSignatures(record)));
    // TEMP DIAG: 3) Supabase REST endpoint host only
    let supabaseHost = 'unknown';
    try {
      supabaseHost = new URL(supabaseUrl).host;
    } catch {
      supabaseHost = '(invalid SUPABASE_URL)';
    }
    console.log('[DIAG create-indemnity-record] 3) Supabase REST host:', supabaseHost, 'path: /rest/v1/indemnity_records');

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

    // TEMP DIAG: 4) HTTP status  6) response.ok
    console.log('[DIAG create-indemnity-record] 4) Supabase HTTP status:', response.status);
    console.log('[DIAG create-indemnity-record] 6) response.ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      // TEMP DIAG: 5) complete Supabase response body
      console.error('[DIAG create-indemnity-record] 5) Supabase response body:', errorText);
      console.error('❌ Failed to insert indemnity_records:', response.status, errorText);
      const clientBody = {
        success: false,
        error: 'Failed to persist indemnity record',
        details: errorText.substring(0, 300)
      };
      // TEMP DIAG: 7) exact JSON returned to frontend
      console.log('[DIAG create-indemnity-record] 7) JSON returned to frontend:', JSON.stringify(clientBody));
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify(clientBody)
      };
    }

    const inserted = await response.json();
    // TEMP DIAG: 5) complete Supabase response body
    console.log('[DIAG create-indemnity-record] 5) Supabase response body:', JSON.stringify(inserted));
    const saved = Array.isArray(inserted) ? inserted[0] : inserted;
    const returnedToken = saved?.access_token || accessToken;

    console.log('✅ Indemnity record saved for booking:', booking_id, 'token:', returnedToken);

    const clientBody = {
      success: true,
      access_token: returnedToken
    };
    // TEMP DIAG: 7) exact JSON returned to frontend
    console.log('[DIAG create-indemnity-record] 7) JSON returned to frontend:', JSON.stringify(clientBody));
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(clientBody)
    };
  } catch (error) {
    console.error('❌ create-indemnity-record error:', error);
    const clientBody = {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    };
    // TEMP DIAG: 7) exact JSON returned to frontend
    console.log('[DIAG create-indemnity-record] 7) JSON returned to frontend:', JSON.stringify(clientBody));
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(clientBody)
    };
  }
};
