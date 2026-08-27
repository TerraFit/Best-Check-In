const supabaseUrl = () => String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = () => process.env.SUPABASE_SERVICE_KEY;

const supabaseHeaders = () => ({
  apikey: supabaseKey(),
  Authorization: `Bearer ${supabaseKey()}`,
  'Content-Type': 'application/json'
});

async function supabaseRest(path, options = {}) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...supabaseHeaders(),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const error = new Error(`Supabase REST error ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ valid: false, error: 'Method Not Allowed' }) };

  try {
    const missing = [];
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');

    if (missing.length) {
      console.error('Verify reset token configuration missing:', missing.join(', '));
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ valid: false, error: 'Password recovery is temporarily unavailable' })
      };
    }

    const { token } = event.queryStringParameters || {};

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ valid: false, error: 'Token required' })
      };
    }

    // Do not instantiate @supabase/supabase-js here. Netlify's Node.js 20
    // runtime does not provide the native WebSocket required by newer
    // supabase-js realtime-js versions. This endpoint only needs PostgREST.
    const rows = await supabaseRest(
      `password_resets?select=id&token=eq.${encodeURIComponent(token)}&expires_at=gte.${encodeURIComponent(new Date().toISOString())}&used_at=is.null&limit=1`
    );

    const data = Array.isArray(rows) ? rows[0] : null;

    if (!data) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: true })
    };
  } catch (error) {
    console.error('Error verifying token:', {
      status: error?.status,
      body: error?.body,
      message: error?.message
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ valid: false, error: 'Unable to verify reset token' })
    };
  }
};
