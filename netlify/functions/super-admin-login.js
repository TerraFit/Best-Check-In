const jwt = require('jsonwebtoken');

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  try {
    const { email, password } = JSON.parse(event.body || '{}');
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (!superAdminEmail || !superAdminPassword || !jwtSecret) {
      console.error('SuperAdmin authentication environment is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    if (email !== superAdminEmail || password !== superAdminPassword) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }

    // Permissions are derived centrally from the signed super_admin role in
    // _auth.cjs. Do not embed a second, stale permission vocabulary in the JWT.
    const token = jwt.sign(
      {
        sub: 'super-admin',
        email: superAdminEmail,
        role: 'super_admin',
        user_metadata: {
          super_admin: true,
          role: 'super_admin'
        }
      },
      jwtSecret,
      { expiresIn: '1h', issuer: 'fastcheckin', audience: 'super-admin' }
    );

    // The HttpOnly cookie is the preferred session transport. The token is
    // retained in the JSON response temporarily for frontend compatibility;
    // privileged APIs must validate it server-side and never trust localStorage.
    const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
    const cookie = `fastcheckin_super_admin=${encodeURIComponent(token)}; Max-Age=3600; Path=/; HttpOnly; SameSite=Strict;${secure}`;

    return {
      statusCode: 200,
      headers: { ...headers, 'Set-Cookie': cookie },
      body: JSON.stringify({
        success: true,
        token,
        expiresIn: 3600,
        admin: {
          id: 'super-admin',
          email: superAdminEmail,
          role: 'super_admin',
          name: 'Super Administrator'
        }
      })
    };
  } catch (error) {
    console.error('Super admin login error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  }
};
