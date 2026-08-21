// Housekeeping service timer configuration.
// Auth required. business_id is bound from JWT; client cannot override tenant scope.

const {
  authenticateHousekeepingService,
  resolveBusinessId,
  schemaMissingResponse,
} = require('./_housekeepingServiceAuth');

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
        `${supabaseUrl}/rest/v1/housekeeping_service_settings?business_id=eq.${encodeURIComponent(businessId)}&select=*&limit=1`,
        { headers: read }
      );
      if (!res.ok) {
        const text = await res.text();
        const missing = schemaMissingResponse(res.status, text, 'housekeeping_service_settings');
        if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) };
        return { statusCode: res.status, headers, body: JSON.stringify({ success: false, error: text }) };
      }
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
    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) {
      return { statusCode: scope.status, headers, body: JSON.stringify({ success: false, error: scope.error }) };
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
    if (!existingRes.ok) {
      const text = await existingRes.text();
      const missing = schemaMissingResponse(existingRes.status, text, 'housekeeping_service_settings');
      if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) };
      return { statusCode: existingRes.status, headers, body: JSON.stringify({ success: false, error: text }) };
    }
    const existing = (await existingRes.json())[0] || null;
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
    if (!res.ok) {
      const missing = schemaMissingResponse(res.status, rows, 'housekeeping_service_settings');
      if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) };
      return { statusCode: res.status, headers, body: JSON.stringify({ success: false, error: rows }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, settings: rows[0] }) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Failed to save service settings' }),
    };
  }
};
