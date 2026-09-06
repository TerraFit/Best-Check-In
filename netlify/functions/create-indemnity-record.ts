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
      indemnity_text
    } = body;

    if (!booking_id || typeof booking_id !== 'string' || booking_id.length > 200 ||
        !business_id || typeof business_id !== 'string' || business_id.length > 200) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'booking_id and business_id are required' })
      };
    }

    if (!signature_data && !guest_signature) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'signature_data is required' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Indemnity configuration is incomplete');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Server configuration error' })
      };
    }

    const restHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json'
    };

    // Public check-in may create an indemnity record, but the supplied booking
    // and business identifiers must be proven to belong together first.
    const bookingResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(booking_id)}&business_id=eq.${encodeURIComponent(business_id)}&select=id,business_id,guest_name,guest_first_name,guest_last_name,status&limit=1`,
      { headers: restHeaders }
    );

    if (!bookingResponse.ok) {
      console.error('Indemnity booking validation failed:', bookingResponse.status);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Unable to validate booking' })
      };
    }

    const bookings = await bookingResponse.json();
    const booking = Array.isArray(bookings) ? bookings[0] : null;
    if (!booking || booking.business_id !== business_id || ['cancelled', 'canceled'].includes(String(booking.status || '').toLowerCase())) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Booking is not available for indemnity' })
      };
    }

    const accessToken = randomUUID();
    const resolvedSignature = signature_data || guest_signature || null;
    const requestHeaders = event.headers || {};
    const ipAddress =
      requestHeaders['x-forwarded-for']?.split(',')[0]?.trim() ||
      requestHeaders['client-ip'] ||
      requestHeaders['x-nf-client-connection-ip'] ||
      null;
    const userAgent = requestHeaders['user-agent'] || null;

    const record = {
      booking_id: booking.id,
      business_id: booking.business_id,
      guest_name: booking.guest_name || guest_name || null,
      guest_first_name: booking.guest_first_name || guest_first_name || null,
      guest_last_name: booking.guest_last_name || guest_last_name || null,
      passport_or_id: passport_or_id || null,
      signature_data: resolvedSignature,
      signed_at: new Date().toISOString(),
      access_token: accessToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      indemnity_text: indemnity_text || null,
      guest_signature: guest_signature || resolvedSignature
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/indemnity_records`, {
      method: 'POST',
      headers: {
        ...restHeaders,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify([record])
    });

    if (!response.ok) {
      console.error('Indemnity insert failed:', response.status);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Failed to persist indemnity record' })
      };
    }

    const inserted = await response.json();
    const persistedToken = Array.isArray(inserted) ? inserted[0]?.access_token : null;
    if (!persistedToken) {
      console.error('Indemnity insert returned no access token');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Indemnity record was not confirmed as inserted' })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, access_token: persistedToken })
    };
  } catch (error) {
    console.error('create-indemnity-record error:', error?.message || error);
    return {
      statusCode: error instanceof SyntaxError ? 400 : 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error instanceof SyntaxError ? 'Invalid JSON in request body' : 'Internal server error'
      })
    };
  }
};
