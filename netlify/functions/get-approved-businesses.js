import { supabaseFetch } from './lib/supabase-rest.js';

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
      body: JSON.stringify({ success: false, error: 'Method Not Allowed', data: [] })
    };
  }

  try {
    const data = await supabaseFetch(
      'businesses?status=eq.approved&select=*&order=created_at.desc'
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: data || [], count: data?.length || 0 })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message, data: [] })
    };
  }
};
