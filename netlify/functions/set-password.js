import { createClient } from '@supabase/supabase-js';
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

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Verify setup token
    const { data: tokenData, error: tokenError } = await supabase
      .from('setup_tokens')
      .select('*')
      .eq('token', token)
      .gte('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update business with password hash
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.business_id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to set password' })
      };
    }

    // Mark token as used
    await supabase
      .from('setup_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    console.log('✅ Password set for business:', tokenData.business_id);

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
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
