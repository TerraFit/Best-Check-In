import auth from './_auth.cjs';

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  },
  body: JSON.stringify(body),
});

const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});
  if (event.httpMethod !== 'GET') return createResponse(405, { success: false, error: 'Method Not Allowed' });

  try {
    const actor = requireBusinessActor(event);
    if (!actor.ok) return authFailure(actor);

    if (!requireBusinessPermission(actor.principal, 'canViewReports')) {
      return authFailure({ status: 403, error: 'Forbidden' });
    }

    const q = event.queryStringParameters || {};
    const tenant = resolveTenant(actor.principal, q.businessId);
    if (!tenant.ok) return authFailure(tenant);
    const businessId = tenant.businessId;

    const dateFrom = q.dateFrom || q.startDate || null;
    const dateTo = q.dateTo || q.endDate || null;
    const { buildAnalyticsSummary, resolveBusinessPlan, fetchBusiness } = await import('./lib/analytics/pipeline.js');
    const { getAnalyticsPlanLimits } = await import('./lib/analytics/packageGates.js');

    const business = await fetchBusiness(businessId);
    if (!business) return createResponse(404, { success: false, error: 'Business not found' });
    const plan = resolveBusinessPlan(business);
    const limits = getAnalyticsPlanLimits(plan);
    const key = JSON.stringify({ businessId, dateFrom, dateTo, type: 'summary' });
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return createResponse(200, { success: true, ...hit.data, limits, cached: true });

    const data = await buildAnalyticsSummary({ businessId, dateFrom, dateTo });
    if (!limits.canInteractiveMap) data.originCountries = data.originCountries.slice(0, 5);
    cache.set(key, { at: Date.now(), data });
    return createResponse(200, { success: true, ...data, limits, cached: false });
  } catch (err) {
    console.error('get-analytics-summary error:', err);
    return createResponse(500, { success: false, error: 'Internal Server Error' });
  }
};
