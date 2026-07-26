const jwt = require('jsonwebtoken');

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
    console.log('📝 Creating audit log:', { 
      action: body.action, 
      user_name: body.user_name, 
      booking_id: body.booking_id 
    });

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

    if (!business_id || !action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: business_id and action are required' 
        })
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

    // ✅ FIX: Handle invalid UUIDs - use placeholder if user_id is 'unknown' or missing
    let finalUserId = user_id;
    if (!finalUserId || finalUserId === 'unknown' || finalUserId === 'null' || finalUserId === 'undefined') {
      finalUserId = '00000000-0000-0000-0000-000000000000';
      console.log('🔑 Using placeholder UUID for missing/invalid user_id');
    }

    // ✅ Build log entry with all fields
    const logEntry = {
      business_id,
      user_id: finalUserId,
      user_name: user_name || 'System',
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

    console.log('📝 Audit log entry:', JSON.stringify(logEntry, null, 2));

    // ✅ Insert into audit_logs
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
      
      // ✅ If guest_name column doesn't exist, retry without it
      if (errorText.includes('guest_name')) {
        console.log('🔄 Retrying without guest_name column...');
        const { guest_name, ...logWithoutGuest } = logEntry;
        
        const retryResponse = await fetch(
          `${supabaseUrl}/rest/v1/audit_logs`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify([logWithoutGuest])
          }
        );
        
        if (!retryResponse.ok) {
          const retryError = await retryResponse.text();
          console.error('❌ Retry failed:', retryError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to create audit log' })
          };
        }
        
        const retryResult = await retryResponse.json();
        console.log('✅ Audit log created (without guest_name):', retryResult[0]?.id);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            log: retryResult[0],
            message: 'Audit log created successfully'
          })
        };
      }
      
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
