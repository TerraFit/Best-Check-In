import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const { email, password, rememberMe = false } = JSON.parse(event.body);
    
    // Fetch business using REST
    const url = `${process.env.SUPABASE_URL}/rest/v1/businesses?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&select=*`;
    const response = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    
    const businesses = await response.json();
    const business = businesses?.[0];

    if (!business) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    if (!business.password_hash) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Account not set up. Please check your email for setup link.' })
      };
    }

    const validPassword = await bcrypt.compare(password, business.password_hash);
    if (!validPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

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

    delete business.password_hash;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token: token,
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
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
