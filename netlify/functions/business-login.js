import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
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

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { email, password } = JSON.parse(event.body);
    console.log('🔐 Business login attempt for:', email);

    // Get business by email
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !business) {
      console.log('❌ Business not found:', email);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    console.log('✅ Business found:', business.trading_name);
    console.log('📊 Business status:', business.status);
    console.log('🔑 Password hash exists:', !!business.password_hash);

    // Check password
    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(password, business.password_hash);
    } catch (compareError) {
      console.error('❌ Password comparison error:', compareError);
    }
    
    if (!validPassword) {
      console.log('❌ Invalid password for:', email);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    console.log('✅ Password valid for:', business.trading_name);

    // Don't send password hash back
    delete business.password_hash;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
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
    console.error('❌ Business login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
