const auth = require('./_auth.cjs');
const { requireBusinessActor, resolveTenant, authFailure } = auth;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers);

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, details, description, booking_id, guest_name, ip_address, user_agent } = body;
    if (!action || typeof action !== 'string' || !action.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Action is required' }) };
    }

    const tenant = resolveTenant(actor.principal, body.business_id);
    if (!tenant.ok) return authFailure(tenant, headers);
    const businessId = tenant.businessId;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const logEntry = {
      business_id: businessId,
      user_id: actor.principal.userId || '00000000-0000-0000-0000-000000000000',
      user_name: actor.principal.email || 'System',
      user_role: actor.principal.role || 'owner',
      action: action.trim(),
      details: details && typeof details === 'object' ? details : {},
      description: typeof description === 'string' && description ? description : `${action.trim()} performed`,
      booking_id: booking_id || null,
      guest_name: guest_name || null,
      ip_address: ip_address || 'unknown',
      user_agent: user_agent || 'unknown',
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([logEntry])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Audit log insert failed:', errorText);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create audit log' }) };
    }

    const result = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, log: result[0], message: 'Audit log created successfully' }) };
  } catch (error) {
    console.error('Error creating audit log:', error?.message || error);
    if (error instanceof SyntaxError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
