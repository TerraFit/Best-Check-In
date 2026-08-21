// netlify/functions/housekeeping-settings.js
// GET / POST housekeeping policy settings per business
// Auth: same JWT / business-tenant model as housekeeping service-performance endpoints.

const {
  authenticateHousekeepingService,
  resolveBusinessId,
} = require('./_housekeepingServiceAuth.cjs');

const VALID_POLICIES = new Set(['eco', 'standard', 'premium', 'custom']);

const DEFAULTS = {
  policy: 'standard',
  custom_refresh_interval: 2,
  custom_full_interval: 3,
  allow_skip_refresh: true,
  mandatory_checkout_fs: true,
  auto_generate: true,
};

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const gate = authenticateHousekeepingService(event, 'manage');
    if (!gate.ok) {
      return {
        statusCode: gate.status || 401,
        headers,
        body: JSON.stringify({ success: false, error: gate.error }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Server configuration error' }),
      };
    }

    const read = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    };
    const write = {
      ...read,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    if (event.httpMethod === 'GET') {
      const scope = resolveBusinessId(
        gate.principal,
        event.queryStringParameters?.businessId || null
      );
      if (!scope.ok) {
        return {
          statusCode: scope.status,
          headers,
          body: JSON.stringify({ success: false, error: scope.error }),
        };
      }
      const businessId = scope.businessId;

      const res = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${encodeURIComponent(businessId)}&select=*`,
        { headers: read }
      );
      const rows = res.ok ? await res.json() : [];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          settings: rows[0] || { business_id: businessId, ...DEFAULTS },
        }),
      };
    }

    // POST
    const body = JSON.parse(event.body || '{}');
    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) {
      return {
        statusCode: scope.status,
        headers,
        body: JSON.stringify({ success: false, error: scope.error }),
      };
    }
    const businessId = scope.businessId;

    if (body.policy !== undefined && !VALID_POLICIES.has(body.policy)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Invalid policy "${body.policy}". Allowed values: eco, standard, premium, custom`,
        }),
      };
    }

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
      if (body[k] !== undefined) payload[k] = body[k];
    }

    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${encodeURIComponent(businessId)}&select=id`,
      { headers: read }
    );
    const existing = existingRes.ok ? await existingRes.json() : [];

    let settings;
    if (existing[0]?.id) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_settings?id=eq.${encodeURIComponent(existing[0].id)}`,
        {
          method: 'PATCH',
          headers: write,
          body: JSON.stringify(payload),
        }
      );
      const rows = await res.json();
      if (!res.ok) {
        return {
          statusCode: res.status,
          headers,
          body: JSON.stringify({ success: false, error: rows }),
        };
      }
      settings = rows[0];
    } else {
      const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_settings`, {
        method: 'POST',
        headers: write,
        body: JSON.stringify({ ...DEFAULTS, ...payload }),
      });
      const rows = await res.json();
      if (!res.ok) {
        return {
          statusCode: res.status,
          headers,
          body: JSON.stringify({ success: false, error: rows }),
        };
      }
      settings = rows[0];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, settings }),
    };
  } catch (error) {
    console.error('housekeeping-settings fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to load housekeeping settings',
      }),
    };
  }
};
