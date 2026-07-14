// netlify/functions/manage-employees.js
// MINIMAL DEBUG VERSION - No auth, just insert

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  // POST - Create employee (NO AUTH)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      console.log('📝 Received body:', JSON.stringify(body, null, 2));

      const { full_name, phone_number, business_id } = body;

      if (!full_name || !phone_number || !business_id) {
        console.log('❌ Missing required fields');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required fields',
            received: { full_name, phone_number, business_id }
          })
        };
      }

      const invitationToken = 'FCINV_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const insertData = {
        business_id: business_id,
        full_name,
        phone_number,
        status: 'Pending',
        role: 'EmployeeOverview',
        invitation_token: invitationToken,
        invitation_expiry: expiryDate.toISOString(),
        invited_at: new Date().toISOString()
      };

      console.log('📝 Inserting:', JSON.stringify(insertData, null, 2));

      const response = await fetch(`${supabaseUrl}/rest/v1/employees`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([insertData])
      });

      console.log('📝 Response status:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Insert error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Insert failed',
            details: error
          })
        };
      }

      const data = await response.json();
      console.log('✅ Insert success:', data);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: data[0]
        })
      };

    } catch (error) {
      console.error('❌ Error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: error.message,
          stack: error.stack 
        })
      };
    }
  }

  // GET - List employees (NO AUTH)
  if (event.httpMethod === 'GET') {
    try {
      const businessId = event.queryStringParameters?.businessId;
      
      if (!businessId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'businessId required' })
        };
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/employees?business_id=eq.${businessId}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch employees', details: error })
        };
      }

      const data = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data || [] })
      };

    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
