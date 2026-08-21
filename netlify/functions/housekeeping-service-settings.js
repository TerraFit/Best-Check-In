// Housekeeping service timer configuration.
// Auth required. business_id is bound from JWT; client cannot override tenant scope.
// Management settings: canManageSettings (business owners/admins). Employees cannot change.

const jwt = require('jsonwebtoken');

function authenticateManagement(event) {
  const authHeader = (event.headers?.authorization || event.headers?.Authorization || '').trim();
  if (!authHeader) {
    return { ok: false, status: 401, error: 'No authorization token provided' };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Invalid token format' };
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { ok: false, status: 401, error: 'Token has expired' };
    }
    return { ok: false, status: 401, error: 'Invalid authorization token' };
  }
  const meta = (decoded && decoded.user_metadata) || {};
  if (decoded.role === 'service_role' || meta.super_admin) {
    return {
      ok: true,
      principal: { actorType: 'super_admin', role: 'super_admin', businessId: meta.business_id || null },
    };
  }
  const businessId = meta.business_id;
  if (!businessId) {
    return { ok: false, status: 403, error: 'Token missing business ID' };
  }
  // Business owner token (no employee_id)
  if (!meta.employee_id) {
    return {
      ok: true,
      principal: { actorType: 'business', role: 'business_owner', businessId },
    };
  }
  const role = meta.staff_role || meta.role || '';
  const perms = Array.isArray(meta.permission_set) ? meta.permission_set : [];
  const manageRoles = ['business_owner', 'general_manager', 'administration', 'supervisor', 'super_admin'];
  if (
    manageRoles.includes(role) ||
    perms.includes('canManageSettings') ||
    perms.includes('canManageHousekeeping')
  ) {
    return {
      ok: true,
      principal: { actorType: 'employee', role, businessId, employeeId: meta.employee_id },
    };
  }
  return { ok: false, status: 403, error: 'Missing permission: canManageSettings' };
}

function resolveBusinessId(event, principal, bodyBusinessId) {
  // Super admin may operate on an explicit businessId when provided
  if (principal.actorType === 'super_admin') {
    const fromQuery = event.queryStringParameters?.businessId;
    const id = bodyBusinessId || fromQuery || principal.businessId;
    if (!id) return { ok: false, status: 400, error: 'businessId required' };
    return { ok: true, businessId: id };
  }
  const tokenBusinessId = principal.businessId;
  const fromQuery = event.queryStringParameters?.businessId;
  const clientId = bodyBusinessId || fromQuery;
  if (clientId && clientId !== tokenBusinessId) {
    return { ok: false, status: 403, error: 'Forbidden: business scope mismatch' };
  }
  return { ok: true, businessId: tokenBusinessId };
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const gate = authenticateManagement(event);
    if (!gate.ok) {
      return { statusCode: gate.status || 401, headers, body: JSON.stringify({ error: gate.error }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };

    if (event.httpMethod === 'GET') {
      const scope = resolveBusinessId(event, gate.principal, null);
      if (!scope.ok) {
        return { statusCode: scope.status, headers, body: JSON.stringify({ error: scope.error }) };
      }
      const businessId = scope.businessId;
      const res = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_service_settings?business_id=eq.${encodeURIComponent(businessId)}&select=*&limit=1`,
        { headers: read }
      );
      if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: await res.text() }) };
      const settings = (await res.json())[0] || {
        business_id: businessId,
        warning_minutes: 15,
        final_countdown_seconds: 5,
        voice_enabled: true,
        sound_enabled: true,
        allow_pause: false,
      };
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, settings }) };
    }

    const body = JSON.parse(event.body || '{}');
    const scope = resolveBusinessId(event, gate.principal, body.businessId);
    if (!scope.ok) {
      return { statusCode: scope.status, headers, body: JSON.stringify({ error: scope.error }) };
    }
    const businessId = scope.businessId;
    const allowed = ['warning_minutes', 'final_countdown_seconds', 'voice_enabled', 'sound_enabled', 'allow_pause'];
    const payload = { business_id: businessId, updated_at: new Date().toISOString() };
    for (const keyName of allowed) {
      if (body[keyName] !== undefined) payload[keyName] = body[keyName];
    }

    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_settings?business_id=eq.${encodeURIComponent(businessId)}&select=id&limit=1`,
      { headers: read }
    );
    const existing = existingRes.ok ? (await existingRes.json())[0] : null;
    let res;
    if (existing?.id) {
      res = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_service_settings?id=eq.${encodeURIComponent(existing.id)}`,
        { method: 'PATCH', headers: write, body: JSON.stringify(payload) }
      );
    } else {
      res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_settings`, {
        method: 'POST',
        headers: write,
        body: JSON.stringify({
          warning_minutes: 15,
          final_countdown_seconds: 5,
          voice_enabled: true,
          sound_enabled: true,
          allow_pause: false,
          ...payload,
        }),
      });
    }
    const rows = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: rows }) };
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, settings: rows[0] }) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to save service settings' }),
    };
  }
};
