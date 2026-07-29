// GET / POST housekeeping policy settings per business

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

const DEFAULTS = {
  policy: 'standard',
  custom_refresh_interval: 2,
  custom_full_interval: 3,
  allow_skip_refresh: true,
  mandatory_checkout_fs: true,
  auto_generate: true,
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (event.httpMethod === 'GET') {
      const businessId = event.queryStringParameters?.businessId;
      if (!businessId) return createResponse(400, { error: 'businessId required' });

      const res = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${businessId}&select=*`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const rows = res.ok ? await res.json() : [];
      return createResponse(200, {
        success: true,
        settings: rows[0] || { business_id: businessId, ...DEFAULTS },
      });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { businessId, ...rest } = body;
      if (!businessId) return createResponse(400, { error: 'businessId required' });

      const allowed = [
        'policy',
        'custom_refresh_interval',
        'custom_full_interval',
        'allow_skip_refresh',
        'mandatory_checkout_fs',
        'auto_generate',
      ];
      const payload = { business_id: businessId, updated_at: new Date().toISOString() };
      for (const k of allowed) {
        if (rest[k] !== undefined) payload[k] = rest[k];
      }

      // Upsert
      const existingRes = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${businessId}&select=id`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const existing = existingRes.ok ? await existingRes.json() : [];

      let settings;
      if (existing[0]?.id) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/housekeeping_settings?id=eq.${existing[0].id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify(payload),
          }
        );
        const rows = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(rows));
        settings = rows[0];
      } else {
        const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings`, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ ...DEFAULTS, ...payload }),
        });
        const rows = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(rows));
        settings = rows[0];
      }

      return createResponse(200, { success: true, settings });
    }

    return createResponse(405, { error: 'Method Not Allowed' });
  } catch (err) {
    console.error('housekeeping-settings', err);
    return createResponse(500, { error: err.message || 'Internal error' });
  }
};
