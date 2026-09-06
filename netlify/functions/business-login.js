// netlify/functions/business-login.js
// Business owner authentication boundary.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { email, password, rememberMe = false } = JSON.parse(event.body || '{}');
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

    if (!normalizedEmail || typeof password !== 'string' || !password) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid email or password' }) };
    }

    const url = `${process.env.SUPABASE_URL}/rest/v1/businesses?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,trading_name,email,password_hash,status,setup_complete`;
    const response = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });

    if (!response.ok) {
      console.error('Business login lookup failed:', response.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Login failed' }) };
    }

    const businesses = await response.json();
    const business = businesses?.[0];

    // Only approved businesses may establish an application session. Keep the
    // response generic so account state is not disclosed at the login boundary.
    if (!business || business.status !== 'approved' || !business.password_hash) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid email or password' }) };
    }

    const validPassword = await bcrypt.compare(password, business.password_hash);
    if (!validPassword) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid email or password' }) };

    const expiresIn = rememberMe ? '7d' : '1d';
    const token = jwt.sign(
      {
        sub: business.id,
        role: 'authenticated',
        user_metadata: {
          business_id: business.id,
          business_name: business.trading_name,
          email: business.email,
          role: 'business'
        }
      },
      process.env.SUPABASE_JWT_SECRET,
      { expiresIn }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token,
        token_expiry: expiresIn,
        business: {
          id: business.id,
          trading_name: business.trading_name,
          email: business.email,
          status: business.status,
          setup_complete: business.setup_complete
        },
        message: 'Login successful'
      })
    };
  } catch (error) {
    console.error('Login error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Login failed' }) };
  }
};
