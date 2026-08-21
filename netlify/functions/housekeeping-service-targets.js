// Housekeeping service targets, including optional room-type overrides.
// Auth required. business_id is bound from JWT; client cannot override tenant scope.

const {
  authenticateHousekeepingService,
  resolveBusinessId,
  schemaMissingResponse,
} = require('./_housekeepingServiceAuth.cjs');

const ALLOWED = new Set(['refresh', 'full_service', 'deep_cleaning', 'mattress_flip_air', 'checkout_inspection']);

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
    const gate = authenticateHousekeepingService(event, 'manage');
    if (!gate.ok) {
      return { statusCode: gate.status || 401, headers, body: JSON.stringify({ success: false, error: gate.error }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }
    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };

    if (event.httpMethod === 'GET') {
      const scope = resolveBusinessId(gate.principal, event.queryStringParameters?.businessId || null);
      if (!scope.ok) {
        return { statusCode: scope.status, headers, body: JSON.stringify({ success: false, error: scope.error }) };
      }
      const businessId = scope.businessId;
      const res = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_service_targets?business_id=eq.${encodeURIComponent(businessId)}&active=eq.true&select=*&order=service_type.asc,room_type.asc.nullsfirst`,
        { headers: read }
      );
      if (!res.ok) {
        const text = await res.text();
        const missing = schemaMissingResponse(res.status, text, 'housekeeping_service_targets');
        if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) };
        return { statusCode: res.status, headers, body: JSON.stringify({ success: false, error: text }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, targets: await res.json() }) };
    }

    const body = JSON.parse(event.body || '{}');
    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) {
      return { statusCode: scope.status, headers, body: JSON.stringify({ success: false, error: scope.error }) };
    }
    const businessId = scope.businessId;
    const { service_type, room_type = null, target_minutes, active = true } = body;
    if (!ALLOWED.has(service_type) || !Number(target_minutes)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'valid service_type and target_minutes are required' }),
      };
    }
    const normalizedRoomType = typeof room_type === 'string' && room_type.trim() ? room_type.trim() : null;
    const filterRoom = normalizedRoomType
      ? `room_type=eq.${encodeURIComponent(normalizedRoomType)}`
      : 'room_type=is.null';
    const lookup = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_targets?business_id=eq.${encodeURIComponent(businessId)}&service_type=eq.${encodeURIComponent(service_type)}&${filterRoom}&select=id&limit=1`,
      { headers: read }
    );
    if (!lookup.ok) {
      const text = await lookup.text();
      const missing = schemaMissingResponse(lookup.status, text, 'housekeeping_service_targets');
      if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) };
      return { statusCode: lookup.status, headers, body: JSON.stringify({ success: false, error: text }) };
    }
    const existing = (await lookup.json())[0] || null;
    const payload = {
      business_id: businessId,
      service_type,
      room_type: normalizedRoomType,
      target_minutes: Math.max(1, Math.min(1440, Number(target_minutes))),
      active: Boolean(active),
      updated_at: new Date().toISOString(),
    };
    let res;
    if (existing?.id) {
      res = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_service_targets?id=eq.${encodeURIComponent(existing.id)}`,
        { method: 'PATCH', headers: write, body: JSON.stringify(payload) }
      );
    } else {
      res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_targets`, {
        method: 'POST',
        headers: write,
        body: JSON.stringify(payload),
      });
    }
    const rows = await res.json();
    if (!res.ok) {
      const missing = schemaMissingResponse(res.status, rows, 'housekeeping_service_targets');
      if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) };
      return { statusCode: res.status, headers, body: JSON.stringify({ success: false, error: rows }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, target: rows[0] }) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Failed to save service target' }),
    };
  }
};
