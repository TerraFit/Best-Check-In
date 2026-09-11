// Housekeeping service timer configuration.
// Auth required. business_id is bound from JWT; client cannot override tenant scope.

const {
  authenticateHousekeepingServiceLive,
  resolveBusinessId,
  schemaMissingResponse,
} = require('./_housekeepingServiceAuth.cjs');

const SETTINGS_SELECT = 'id,business_id,warning_minutes,final_countdown_seconds,voice_enabled,sound_enabled,allow_pause,created_at,updated_at';

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  const response = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (!['GET', 'POST'].includes(event.httpMethod)) return response(405, { error: 'Method Not Allowed' });

  try {
    const gate = await authenticateHousekeepingServiceLive(event, 'manage');
    if (!gate.ok) return response(gate.status || 401, { success: false, error: gate.error, code: gate.code });
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return response(500, { success: false, error: 'Server configuration error' });
    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };

    if (event.httpMethod === 'GET') {
      const scope = resolveBusinessId(gate.principal, event.queryStringParameters?.businessId || null);
      if (!scope.ok) return response(scope.status, { success: false, error: scope.error });
      const businessId = scope.businessId;
      const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_settings?business_id=eq.${encodeURIComponent(businessId)}&select=${SETTINGS_SELECT}&limit=1`, { headers: read });
      if (!res.ok) {
        const text = await res.text();
        const missing = schemaMissingResponse(res.status, text, 'housekeeping_service_settings');
        if (missing) return response(503, missing);
        console.error('housekeeping-service-settings GET failed:', res.status);
        return response(503, { success: false, error: 'Unable to load service settings' });
      }
      const settings = (await res.json())[0] || { business_id: businessId, warning_minutes: 15, final_countdown_seconds: 5, voice_enabled: true, sound_enabled: true, allow_pause: false };
      return response(200, { success: true, settings });
    }

    const body = JSON.parse(event.body || '{}');
    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) return response(scope.status, { success: false, error: scope.error });
    const businessId = scope.businessId;
    const allowed = ['warning_minutes', 'final_countdown_seconds', 'voice_enabled', 'sound_enabled', 'allow_pause'];
    const payload = { business_id: businessId, updated_at: new Date().toISOString() };
    for (const keyName of allowed) if (body[keyName] !== undefined) payload[keyName] = body[keyName];

    const existingRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_settings?business_id=eq.${encodeURIComponent(businessId)}&select=id&limit=1`, { headers: read });
    if (!existingRes.ok) {
      const text = await existingRes.text();
      const missing = schemaMissingResponse(existingRes.status, text, 'housekeeping_service_settings');
      if (missing) return response(503, missing);
      console.error('housekeeping-service-settings lookup failed:', existingRes.status);
      return response(503, { success: false, error: 'Unable to load service settings' });
    }
    const existing = (await existingRes.json())[0] || null;
    let res;
    if (existing?.id) {
      res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_settings?id=eq.${encodeURIComponent(existing.id)}`, { method: 'PATCH', headers: write, body: JSON.stringify(payload) });
    } else {
      res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_settings`, { method: 'POST', headers: write, body: JSON.stringify({ warning_minutes: 15, final_countdown_seconds: 5, voice_enabled: true, sound_enabled: true, allow_pause: false, ...payload }) });
    }
    const rows = await res.json();
    if (!res.ok) {
      const missing = schemaMissingResponse(res.status, rows, 'housekeeping_service_settings');
      if (missing) return response(503, missing);
      console.error('housekeeping-service-settings write failed:', res.status);
      return response(503, { success: false, error: 'Unable to save service settings' });
    }
    return response(200, { success: true, settings: rows[0] });
  } catch (error) {
    console.error('housekeeping-service-settings fatal:', error);
    return response(500, { success: false, error: 'Failed to save service settings' });
  }
};
