const auth = require('./_auth.cjs');
const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

const createResponse = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }, body: JSON.stringify(body) });
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});
  if (event.httpMethod !== 'GET') return createResponse(405, { success: false, error: 'Method Not Allowed' });

  const authResult = requireBusinessActor(event);
  if (!authResult.ok) return authFailure(authResult);
  if (!requireBusinessPermission(authResult.principal, 'canViewReports')) {
    return authFailure({ status: 403, error: 'Forbidden' });
  }

  const q = event.queryStringParameters || {};
  const tenant = resolveTenant(authResult.principal, q.businessId);
  if (!tenant.ok) return authFailure(tenant);
  const businessId = tenant.businessId;
  const dateFrom = q.dateFrom || q.startDate || null;
  const dateTo = q.dateTo || q.endDate || null;

  try {
    const { resolveBusinessPlan, fetchBusiness } = await import('./lib/analytics/pipeline.js');
    const { buildRoomPerformance } = await import('./lib/analytics/roomPerformance.js');
    const { getAnalyticsPlanLimits } = await import('./lib/analytics/packageGates.js');
    const business = await fetchBusiness(businessId);
    if (!business) return createResponse(404, { success: false, error: 'Business not found' });
    const plan = resolveBusinessPlan(business);
    const limits = getAnalyticsPlanLimits(plan);
    const key = JSON.stringify({ businessId, dateFrom, dateTo, type: 'room-performance' });
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return createResponse(200, { success: true, ...hit.data, limits, cached: true });
    const data = await buildRoomPerformance({ businessId, dateFrom, dateTo });
    cache.set(key, { at: Date.now(), data });
    return createResponse(200, { success: true, ...data, limits, cached: false });
  } catch (err) {
    console.error('get-room-performance error:', err);
    return createResponse(err.statusCode || 500, { success: false, error: 'Internal Server Error' });
  }
};
