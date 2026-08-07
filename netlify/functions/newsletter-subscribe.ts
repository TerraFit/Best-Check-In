import { Handler } from '@netlify/functions';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_KEY || '',
    Authorization: `Bearer ${SUPABASE_KEY || ''}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

function isDuplicateKeyError(body: string): boolean {
  return body.includes('23505') || body.includes('newsletter_subscribers_business_id_email_key');
}

export const handler: Handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
      return {
        statusCode: 500,
        headers: cors,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const {
      business_id,
      email,
      guest_name,
      first_name,
      last_name,
      referred_by,
      source
    } = body;

    if (!business_id || !email) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Business ID and email are required' })
      };
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const resolvedGuestName =
      guest_name ||
      (first_name || last_name
        ? [first_name, last_name].filter(Boolean).join(' ').trim()
        : null);

    // Business name (non-throwing)
    let businessName: string | null = null;
    try {
      const bizRes = await fetch(
        `${SUPABASE_URL}/rest/v1/businesses?id=eq.${encodeURIComponent(business_id)}&select=trading_name`,
        { method: 'GET', headers: headers() }
      );
      if (bizRes.ok) {
        const rows = await bizRes.json();
        businessName = rows?.[0]?.trading_name || null;
      }
    } catch (e) {
      console.warn('Could not fetch business name:', e);
    }

    const accessToken = randomUUID();

    // Minimal row — columns known to be used by send-confirmation-email
    const minimalRow: Record<string, unknown> = {
      business_id,
      email: normalizedEmail,
      guest_name: resolvedGuestName,
      source: source || 'email',
      created_at: new Date().toISOString()
    };

    // Extended row — optional columns (may not exist yet)
    const extendedRow: Record<string, unknown> = {
      ...minimalRow,
      access_token: accessToken
    };
    if (first_name) extendedRow.first_name = first_name;
    if (last_name) extendedRow.last_name = last_name;
    if (referred_by) extendedRow.referred_by = referred_by;

    // Explicit conflict target so PostgREST performs a real upsert
    const upsertUrl =
      `${SUPABASE_URL}/rest/v1/newsletter_subscribers?on_conflict=business_id,email`;
    const prefer =
      'resolution=merge-duplicates,return=representation';

    // Try extended first; fall back to minimal if schema rejects unknown columns
    let upsertRes = await fetch(upsertUrl, {
      method: 'POST',
      headers: headers({ Prefer: prefer }),
      body: JSON.stringify(extendedRow)
    });

    let upsertBody = await upsertRes.text();

    if (!upsertRes.ok && !isDuplicateKeyError(upsertBody)) {
      console.warn('Extended upsert failed:', upsertRes.status, upsertBody);

      upsertRes = await fetch(upsertUrl, {
        method: 'POST',
        headers: headers({ Prefer: prefer }),
        body: JSON.stringify(minimalRow)
      });
      upsertBody = await upsertRes.text();
    }

    // Idempotent: already subscribed is success
    if (!upsertRes.ok && isDuplicateKeyError(upsertBody)) {
      let existingToken = accessToken;
      try {
        const existingRes = await fetch(
          `${SUPABASE_URL}/rest/v1/newsletter_subscribers?business_id=eq.${encodeURIComponent(business_id)}&email=eq.${encodeURIComponent(normalizedEmail)}&select=access_token&limit=1`,
          { method: 'GET', headers: headers() }
        );
        if (existingRes.ok) {
          const rows = await existingRes.json();
          if (rows?.[0]?.access_token) existingToken = rows[0].access_token;
        }
      } catch {
        // ignore — still return success
      }

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          success: true,
          business_name: businessName,
          access_token: existingToken,
          already_subscribed: true
        })
      };
    }

    if (!upsertRes.ok) {
      console.error('Newsletter upsert failed:', upsertRes.status, upsertBody);
      return {
        statusCode: 500,
        headers: cors,
        body: JSON.stringify({
          error: 'Failed to subscribe',
          details: upsertBody
        })
      };
    }

    // Prefer DB-returned access_token if column exists; otherwise use generated one
    let returnedToken = accessToken;
    try {
      const parsed = upsertBody ? JSON.parse(upsertBody) : null;
      const row = Array.isArray(parsed) ? parsed[0] : parsed;
      if (row?.access_token) returnedToken = row.access_token;
    } catch {
      // ignore parse errors
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        business_name: businessName,
        access_token: returnedToken
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};
