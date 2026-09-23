const jwt = require('jsonwebtoken');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
};

const response = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});

function authenticate(event) {
  const token = event.headers?.authorization?.replace('Bearer ', '');
  if (!token) throw Object.assign(new Error('No authorization token provided'), { statusCode: 401 });
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    if (!decoded.sub || decoded.role !== 'authenticated') {
      throw Object.assign(new Error('Token missing authenticated business identity'), { statusCode: 403 });
    }
    return decoded;
  } catch (err) {
    if (err.statusCode) throw err;
    throw Object.assign(new Error(err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token signature'), { statusCode: 401 });
  }
}

function assertTenant(event, decoded) {
  const q = event.queryStringParameters || {};
  const businessId = q.businessId || decoded.sub;
  if (businessId !== decoded.sub) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  return businessId;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: process.env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (!['GET', 'PUT'].includes(event.httpMethod)) return response(405, { success: false, error: 'Method Not Allowed' });

  try {
    const decoded = authenticate(event);
    const q = event.queryStringParameters || {};

    let body = null;
    if (event.httpMethod === 'PUT') {
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return response(400, { success: false, error: 'Invalid JSON body' });
      }
    }

    const requestedBusinessId = q.businessId || body?.businessId || decoded.sub;
    if (requestedBusinessId !== decoded.sub) {
      return response(403, { success: false, error: 'Forbidden' });
    }
    const businessId = requestedBusinessId;

    const dateFrom = q.dateFrom || q.startDate || body?.dateFrom || body?.startDate;
    const dateTo = q.dateTo || q.endDate || body?.dateTo || body?.endDate;

    if (!dateFrom || !dateTo) {
      return response(400, { success: false, error: 'dateFrom and dateTo are required' });
    }

    const encodedBusinessId = encodeURIComponent(businessId);
    const encodedFrom = encodeURIComponent(dateFrom);
    const encodedTo = encodeURIComponent(dateTo);
    const baseUrl = `${process.env.SUPABASE_URL}/rest/v1/analytics_financial_inputs`;
    const filter = `business_id=eq.${encodedBusinessId}&date_from=eq.${encodedFrom}&date_to=eq.${encodedTo}`;

    if (event.httpMethod === 'GET') {
      const result = await fetch(`${baseUrl}?select=id,business_id,date_from,date_to,revenue,cost_of_sale,operating_costs,created_at,updated_at&${filter}&limit=1`, {
        headers: supabaseHeaders(),
      });
      if (!result.ok) throw new Error(`Supabase REST error ${result.status}: ${await result.text()}`);
      const rows = await result.json();
      const row = rows[0] || null;
      return response(200, {
        success: true,
        financials: row ? {
          revenue: row.revenue == null ? null : Number(row.revenue),
          costOfSale: row.cost_of_sale == null ? null : Number(row.cost_of_sale),
          operatingCosts: row.operating_costs == null ? null : Number(row.operating_costs),
          updatedAt: row.updated_at || row.created_at || null,
        } : null,
      });
    }

    const values = ['revenue', 'costOfSale', 'operatingCosts'];
    const normalized = {};
    for (const key of values) {
      if (body[key] === null || body[key] === undefined || body[key] === '') {
        normalized[key] = null;
        continue;
      }
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value < 0) {
        return response(400, { success: false, error: `${key} must be a non-negative number or empty` });
      }
      normalized[key] = Math.round(value * 100) / 100;
    }

    const payload = {
      business_id: businessId,
      date_from: dateFrom,
      date_to: dateTo,
      revenue: normalized.revenue,
      cost_of_sale: normalized.costOfSale,
      operating_costs: normalized.operatingCosts,
    };

    const result = await fetch(`${baseUrl}?on_conflict=business_id,date_from,date_to`, {
      method: 'POST',
      headers: supabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(payload),
    });
    if (!result.ok) throw new Error(`Supabase REST error ${result.status}: ${await result.text()}`);
    const rows = await result.json();
    const row = rows[0];
    return response(200, {
      success: true,
      financials: {
        revenue: row.revenue == null ? null : Number(row.revenue),
        costOfSale: row.cost_of_sale == null ? null : Number(row.cost_of_sale),
        operatingCosts: row.operating_costs == null ? null : Number(row.operating_costs),
        updatedAt: row.updated_at || row.created_at || null,
      },
    });
  } catch (err) {
    console.error('get-analytics-financials error:', err);
    return response(err.statusCode || 500, { success: false, error: err.message || 'Internal Server Error' });
  }
};
