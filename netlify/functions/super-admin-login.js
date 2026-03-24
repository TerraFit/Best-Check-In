// netlify/functions/super-admin-login.js
export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, password } = JSON.parse(event.body);
    
    // Get from environment variables
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@jbay.app';
    const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
    
    if (!SUPER_ADMIN_PASSWORD) {
      console.error('SUPER_ADMIN_PASSWORD environment variable not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    if (email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          admin: {
            email: SUPER_ADMIN_EMAIL,
            role: 'super_admin',
            name: 'Super Administrator'
          }
        })
      };
    }

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid credentials' })
    };
  } catch (error) {
    console.error('Super admin login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
