// netlify/functions/get-employee-by-token.js
// ✅ Using REST API directly - no WebSocket needed

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Get token from query string
    const { token } = event.queryStringParameters || {};

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing token parameter' })
      };
    }

    console.log('🔍 get-employee-by-token called with token:', token);

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

    // ============================================================
    // ✅ Use REST API directly - NO WebSocket
    // ============================================================
    const response = await fetch(
      `${supabaseUrl}/rest/v1/employees?invitation_token=eq.${encodeURIComponent(token)}&select=*`,
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
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Database error',
          details: errorText
        })
      };
    }

    const employees = await response.json();
    const employee = employees?.[0];

    if (!employee) {
      console.log('❌ No employee found with token:', token);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid or expired invitation token',
          details: 'No employee found with this token'
        })
      };
    }

    console.log('✅ Employee found:', employee.full_name);
    console.log('📱 Phone:', employee.phone_number);
    console.log('📊 Status:', employee.status);
    console.log('⏰ Expiry:', employee.invitation_expiry);

    // Check if token is expired
    const isExpired = new Date() > new Date(employee.invitation_expiry);
    if (isExpired) {
      console.log('❌ Token expired on:', employee.invitation_expiry);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invitation link has expired. Please request a new one from your employer.',
          expired: true
        })
      };
    }

    // Check if already activated
    if (employee.status === 'Active') {
      console.log('❌ Account already activated');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'This account has already been activated.',
          alreadyActivated: true
        })
      };
    }

    // Get business name
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${employee.business_id}&select=trading_name`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let businessName = 'J-Bay Zebra Lodge';
    if (businessResponse.ok) {
      const businesses = await businessResponse.json();
      if (businesses?.[0]?.trading_name) {
        businessName = businesses[0].trading_name;
      }
    }

    // Remove sensitive data before sending
    const { password_hash, ...safeEmployee } = employee;

    console.log('✅ Returning employee data for:', safeEmployee.full_name);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        employee: safeEmployee,
        businessName: businessName
      })
    };

  } catch (error) {
    console.error('❌ Error in get-employee-by-token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};
