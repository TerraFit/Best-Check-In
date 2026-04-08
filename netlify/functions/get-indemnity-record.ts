import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const token = event.queryStringParameters?.token;
    
    if (!token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token required' }) };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data, error } = await supabase
      .from('indemnity_records')
      .select(`
        guest_name,
        guest_first_name,
        guest_last_name,
        passport_or_id,
        signature_data,
        signed_at,
        businesses:business_id (
          trading_name,
          logo_url
        )
      `)
      .eq('access_token', token)
      .single();

    if (error || !data) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Indemnity record not found' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        guest_name: data.guest_name,
        guest_first_name: data.guest_first_name,
        guest_last_name: data.guest_last_name,
        passport_or_id: data.passport_or_id,
        signature_data: data.signature_data,
        signed_at: data.signed_at,
        business_name: data.businesses?.trading_name,
        business_logo: data.businesses?.logo_url
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
