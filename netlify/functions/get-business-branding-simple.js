import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  // Simple headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const businessId = event.queryStringParameters?.id;
    
    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    // Get Supabase key
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Create client WITHOUT any options
    const supabase = createClient(
      process.env.SUPABASE_URL,
      supabaseKey
    );

    // Simple query first - just get basic info
    const { data, error } = await supabase
      .from('businesses')
      .select('id, trading_name, email, phone')
      .eq('id', businessId)
      .single();

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message, code: error.code })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
