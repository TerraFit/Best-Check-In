exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { 
      business_id, 
      user_id, 
      user_name, 
      user_role,
      action, 
      details, 
      description, 
      booking_id,
      guest_name,
      ip_address,
      user_agent
    } = body;

    console.log('📝 Creating audit log:', { action, user_name, booking_id });

    if (!business_id || !user_id || !action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
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

    // ✅ Create audit log entry for audit_logs table
    const logEntry = {
      business_id,
      user_id,
      user_name: user_name || 'Unknown User',
      user_role: user_role || 'owner',
      action,
      details: details || {},
      description: description || `${action} performed`,
      booking_id: booking_id || null,
      guest_name: guest_name || null,
      ip_address: ip_address || 'unknown',
      user_agent: user_agent || 'unknown',
      created_at: new Date().toISOString()
    };

    console.log('📝 Audit log entry:', logEntry);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/audit_logs`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([logEntry])
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Audit log error:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create audit log' })
      };
    }

    const result = await response.json();
    console.log('✅ Audit log created:', result[0]?.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        log: result[0],
        message: 'Audit log created successfully'
      })
    };

  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to create audit log' 
      })
    };
  }
};
