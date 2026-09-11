// netlify/functions/housekeeping-settings.js
// GET / POST housekeeping policy settings per business
// Auth: same JWT / business-tenant model as housekeeping service-performance endpoints.

const { authenticateHousekeepingServiceLive, resolveBusinessId } = require('./_housekeepingServiceAuth.cjs');

const VALID_POLICIES = new Set(['eco', 'standard', 'premium', 'custom']);
const SETTINGS_SELECT = 'id,business_id,policy,custom_refresh_interval,custom_full_interval,allow_skip_refresh,mandatory_checkout_fs,auto_generate,created_at,updated_at';
const DEFAULTS = { policy: 'standard', custom_refresh_interval: 2, custom_full_interval: 3, allow_skip_refresh: true, mandatory_checkout_fs: true, auto_generate: true };

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
      const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${encodeURIComponent(businessId)}&select=${SETTINGS_SELECT}&limit=1`, { headers: read });
      if (!res.ok) {
        console.error('housekeeping-settings GET failed:', res.status);
        return response(503, { success: false, error: 'Unable to load housekeeping settings' });
      }
      const rows = await res.json();
      return response(200, { success: true, settings: rows[0] || { business_id: businessId, ...DEFAULTS } });
    }

    const body = JSON.parse(event.body || '{}');
    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) return response(scope.status, { success: false, error: scope.error });
    const businessId = scope.businessId;
    if (body.policy !== undefined && !VALID_POLICIES.has(body.policy)) {
      return response(400, { success: false, error: `Invalid policy "${body.policy}". Allowed values: eco, standard, premium, custom` });
    }
    const allowed = ['policy', 'custom_refresh_interval', 'custom_full_interval', 'allow_skip_refresh', 'mandatory_checkout_fs', 'auto_generate'];
    const payload = { business_id: businessId, updated_at: new Date().toISOString() };
    for (const k of allowed) if (body[k] !== undefined) payload[k] = body[k];

    const existingRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${encodeURIComponent(businessId)}&select=id`, { headers: read });
    if (!existingRes.ok) {
      console.error('housekeeping-settings lookup failed:', existingRes.status);
      return response(503, { success: false, error: 'Unable to load housekeeping settings' });
    }
    const existing = await existingRes.json();
    let res;
    if (existing[0]?.id) {
      res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings?id=eq.${encodeURIComponent(existing[0].id)}`, { method: 'PATCH', headers: write, body: JSON.stringify(payload) });
    } else {
      res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings`, { method: 'POST', headers: write, body: JSON.stringify({ ...DEFAULTS, ...payload }) });
    }
    const rows = await res.json();
    if (!res.ok) {
      console.error('housekeeping-settings write failed:', res.status);
      return response(503, { success: false, error: 'Unable to save housekeeping settings' });
    }
    return response(200, { success: true, settings: rows[0] });
  } catch (error) {
    console.error('housekeeping-settings fatal:', error);
    return response(500, { success: false, error: 'Failed to save housekeeping settings' });
  }
};
