import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Configuration error', data: [] })
    };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: { ws: ws },
        auth: { persistSession: false }
      }
    );

    const { status, businessId } = event.queryStringParameters || {};

    let query = supabase
      .from('change_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (businessId) query = query.eq('business_id', businessId);

    const { data, error } = await query;

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || [])
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message, data: [] })
    };
  }
};
