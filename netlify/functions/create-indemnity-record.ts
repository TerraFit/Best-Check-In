export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { booking_id, business_id, guest_name, guest_first_name, guest_last_name, passport_or_id, signature_data } = JSON.parse(event.body || '{}');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/indemnity_records`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([{
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
      }])
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    const indemnityRecord = result[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, access_token: indemnityRecord.access_token })
    };

  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
