import bcrypt from 'bcryptjs';

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const missing = [];
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');

    if (missing.length) {
      console.error('Update password configuration missing:', missing.join(', '));
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'Password recovery is temporarily unavailable' })
      };
    }

    const { token, password } = JSON.parse(event.body || '{}');

    if (!token || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token and password required' })
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      };
    }

    // This endpoint only needs PostgREST. Do not instantiate @supabase/supabase-js:
    // Netlify's Node.js 20 runtime does not provide the native WebSocket required by
    // newer supabase-js realtime-js versions.
    const resetRows = await supabaseRest(
      `password_resets?select=id,business_id&token=eq.${encodeURIComponent(token)}&expires_at=gte.${encodeURIComponent(new Date().toISOString())}&used_at=is.null&limit=1`
    );

    const resetRecord = Array.isArray(resetRows) ? resetRows[0] : null;

    if (!resetRecord) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await supabaseRest(`businesses?id=eq.${encodeURIComponent(resetRecord.business_id)}`, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ password_hash: hashedPassword })
    });

    await supabaseRest(`password_resets?id=eq.${encodeURIComponent(resetRecord.id)}&used_at=is.null`, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ used_at: new Date().toISOString() })
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error in update-password:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to reset password' })
    };
  }
};
