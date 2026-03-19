import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { token } = event.queryStringParameters || {};

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ valid: false, error: 'Token required' })
      };
    }

    const { data, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .gte('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (error || !data) {
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
    console.error('Error verifying token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ valid: false, error: error.message })
    };
  }
};
