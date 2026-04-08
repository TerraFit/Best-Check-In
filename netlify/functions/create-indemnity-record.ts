import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { booking_id, business_id, guest_name, guest_first_name, guest_last_name, passport_or_id, signature_data } = JSON.parse(event.body || '{}');

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data, error } = await supabase
      .from('indemnity_records')
      .insert({
        booking_id,
        business_id,
        guest_name,
        guest_first_name,
        guest_last_name,
        passport_or_id,
        signature_data,
        signed_at: new Date().toISOString(),
        ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'],
        user_agent: event.headers['user-agent']
      })
      .select('access_token')
      .single();

    if (error) {
      console.error('Database error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to save indemnity record' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, access_token: data.access_token })
    };

  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
