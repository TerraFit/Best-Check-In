import bcrypt from 'bcryptjs';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

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
    const { token, password } = JSON.parse(event.body || '{}');

    if (!token || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token and password are required' })
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration is missing');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to set password' })
      };
    }

    // Hash the password in Node. The database RPC then performs the
    // token validation, row lock, password update and token consumption
    // atomically in a single PostgreSQL transaction.
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/set_business_password_with_setup_token`,
      {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_token: token,
          p_password_hash: passwordHash
        })
      }
    );

    if (!rpcResponse.ok) {
      let rpcError = null;

      try {
        rpcError = await rpcResponse.json();
      } catch {
        // Keep the response generic if Supabase did not return JSON.
      }

      const errorMessage =
        typeof rpcError?.message === 'string'
          ? rpcError.message
          : typeof rpcError?.error === 'string'
            ? rpcError.error
            : '';

      if (
        errorMessage.includes('INVALID_OR_EXPIRED_TOKEN') ||
        errorMessage.includes('TOKEN_ALREADY_USED')
      ) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid or expired token' })
        };
      }

      console.error('Password setup transaction failed:', {
        status: rpcResponse.status,
        message: errorMessage || 'Supabase RPC request failed'
      });

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to set password' })
      };
    }

    const businessId = await rpcResponse.json();

    console.log('✅ Password set for business:', businessId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Password set successfully. You can now log in.'
      })
    };
  } catch (error) {
    console.error('Set password error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to set password' })
    };
  }
};
