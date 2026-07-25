// netlify/functions/get-audit-logs.js
// ✅ FIXED: Reads from audit_logs (NOT food_restriction_audit)

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
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

  try {
    const { businessId, limit = 50, offset = 0 } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    console.log(`🔍 Fetching audit logs for business: ${businessId}`);

    // ✅ CRITICAL FIX: Query audit_logs (NOT food_restriction_audit)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/audit_logs?business_id=eq.${encodeURIComponent(businessId)}&select=*&order=created_at.desc&limit=${parseInt(limit)}&offset=${parseInt(offset)}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch audit logs' })
      };
    }

    const data = await response.json();
    console.log(`✅ Found ${data?.length || 0} audit logs`);

    // ✅ Map to frontend expectations
    const mappedData = data.map(log => ({
      id: log.id,
      business_id: log.business_id,
      user_id: log.user_id,
      user_name: log.user_name || 'Unknown User',
      action: log.action,
      details: log.details || {},
      description: log.description || log.action,
      booking_id: log.booking_id,
      guest_name: log.guest_name || log.details?.guest_name || 'Unknown Guest',
      ip_address: log.ip_address || 'unknown',
      user_agent: log.user_agent || 'unknown',
      created_at: log.created_at
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: mappedData,
        total: mappedData.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      })
    };

  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to fetch audit logs' 
      })
    };
  }
};
