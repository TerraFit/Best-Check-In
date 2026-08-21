// netlify/functions/housekeeping-settings.js
// GET / POST housekeeping policy settings per business
// CommonJS exports.handler — same pattern as get-rooms.js

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const DEFAULTS = {
    policy: 'standard',
    custom_refresh_interval: 2,
    custom_full_interval: 3,
    allow_skip_refresh: true,
    mandatory_checkout_fs: true,
    auto_generate: true,
  };

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    if (event.httpMethod === 'GET') {
      const businessId = event.queryStringParameters?.businessId;
      if (!businessId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId required' }) };
      const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${businessId}&select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
      const rows = res.ok ? await res.json() : [];
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, settings: rows[0] || { business_id: businessId, ...DEFAULTS } }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { businessId, ...rest } = body;
      if (!businessId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId required' }) };
      const allowed = ['policy', 'custom_refresh_interval', 'custom_full_interval', 'allow_skip_refresh', 'mandatory_checkout_fs', 'auto_generate'];
      const payload = { business_id: businessId, updated_at: new Date().toISOString() };
      for (const k of allowed) if (rest[k] !== undefined) payload[k] = rest[k];

      const existingRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${businessId}&select=id`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
      const existing = existingRes.ok ? await existingRes.json() : [];
      let settings;
      if (existing[0]?.id) {
        const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings?id=eq.${existing[0].id}`, { method: 'PATCH', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation', Accept: 'application/json' }, body: JSON.stringify(payload) });
        const rows = await res.json();
        if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: rows }) };
        settings = rows[0];
      } else {
        const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation', Accept: 'application/json' }, body: JSON.stringify({ ...DEFAULTS, ...payload }) });
        const rows = await res.json();
        if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: rows }) };
        settings = rows[0];
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, settings }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (error) {
    console.error('housekeeping-settings fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Failed to load housekeeping settings' }) };
  }
};
