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

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request' })
      };
    }

    const token = String(body.token || '').trim();
    const password = String(body.password || '');

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

    // This endpoint intentionally does not require a normal JWT/RBAC principal:
    // the single-use reset token is the recovery credential. The token's
    // business_id is resolved server-side and is never accepted from the caller.
    //
    // Keep all authorization and mutation inside one database transaction. This
    // prevents a token from being consumed if the password update fails and makes
    // concurrent/replay attempts serialize on the reset row.
    const hashedPassword = await bcrypt.hash(password, 10);

    // PostgREST exposes the transaction as a single RPC call. Do not instantiate
    // @supabase/supabase-js: Netlify's Node.js 20 runtime does not provide the
    // native WebSocket required by newer supabase-js realtime-js versions.
    await supabaseRest('rpc/reset_business_password_with_token', {
      method: 'POST',
      body: JSON.stringify({
        p_token: token,
        p_password_hash: hashedPassword
      })
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error in update-password:', {
      status: error?.status,
      body: error?.body,
      message: error?.message
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to reset password' })
    };
  }
};
