import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const businessId = typeof event.queryStringParameters?.id === 'string'
      ? event.queryStringParameters.id.trim()
      : '';
    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase environment variables');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from('businesses')
      .select('logo_url')
      .eq('id', businessId)
      .eq('status', 'approved')
      .maybeSingle();

    if (error) {
      console.error('Business logo lookup failed:', error?.message || error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch business logo' }) };
    }

    if (!data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ logo_url: data.logo_url || null })
    };
  } catch (error) {
    console.error('Unhandled business logo error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
