// netlify/functions/get-employee-by-token.js
// Public invitation capability endpoint: only returns the minimum onboarding data.

export const handler = async (event) => {
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

  try {
    const { token } = event.queryStringParameters || {};

    if (!token || typeof token !== 'string' || token.length > 256) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid invitation token' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const select = [
      'id',
      'business_id',
      'full_name',
      'phone_number',
      'role',
      'status',
      'invitation_expiry',
      'invited_at'
    ].join(',');

    const response = await fetch(
      `${supabaseUrl}/rest/v1/employees?invitation_token=eq.${encodeURIComponent(token)}&select=${encodeURIComponent(select)}&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase REST error:', response.status, errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Unable to verify invitation' })
      };
    }

    const employees = await response.json();
    const employee = employees?.[0];

    if (!employee) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired invitation token' })
      };
    }

    const isExpired = !employee.invitation_expiry || new Date() > new Date(employee.invitation_expiry);
    if (isExpired) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invitation link has expired. Please request a new one from your employer.',
          expired: true
        })
      };
    }

    if (employee.status === 'Active') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'This account has already been activated.',
          alreadyActivated: true
        })
      };
    }

    let businessName = 'your business';
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(employee.business_id)}&select=trading_name&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (businessResponse.ok) {
      const businesses = await businessResponse.json();
      if (businesses?.[0]?.trading_name) businessName = businesses[0].trading_name;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        employee,
        businessName
      })
    };
  } catch (error) {
    console.error('❌ Error in get-employee-by-token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Unable to verify invitation' })
    };
  }
};
