import auth from './_auth.cjs';

const createResponse = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }, body: JSON.stringify(body) });
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;
const cacheKey = (params) => JSON.stringify(params);

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

    const level = (q.level || 'world').toLowerCase();
    const dateFrom = q.dateFrom || q.startDate || null;
    const dateTo = q.dateTo || q.endDate || null;
    const continent = q.continent || null;
    const country = q.country || null;
    const region = q.region || null;
    const city = q.city || null;
    const { buildVisitorOrigins, fetchBusiness, resolveBusinessPlan } = await import('./lib/analytics/pipeline.js');
    const { assertDrillAllowed, getAnalyticsPlanLimits } = await import('./lib/analytics/packageGates.js');
    const business = await fetchBusiness(businessId);
    if (!business) return createResponse(404, { success: false, error: 'Business not found' });
    const plan = resolveBusinessPlan(business);
    const gate = assertDrillAllowed(plan, level);
    if (!gate.allowed) return createResponse(403, { success: false, error: gate.reason, requiredPlan: gate.requiredPlan, limits: gate.limits, upgradeRequired: true });

    const key = cacheKey({ businessId, dateFrom, dateTo, level, continent, country, region, city });
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return createResponse(200, { success: true, ...hit.data, limits: getAnalyticsPlanLimits(plan), cached: true });
    const data = await buildVisitorOrigins({ businessId, dateFrom, dateTo, level, continent, country, region, city });
    if (level === 'world' || level === 'continent') {
      const countryData = await buildVisitorOrigins({ businessId, dateFrom, dateTo, level: 'country', continent: level === 'continent' ? continent : null, country: null, region: null, city: null });
      data.nodes = countryData.nodes || [];
      data.mapNodes = countryData.nodes || [];
    } else if (level === 'country') data.mapNodes = data.nodes || [];
    else data.mapNodes = [];
    cache.set(key, { at: Date.now(), data });
    return createResponse(200, { success: true, ...data, limits: getAnalyticsPlanLimits(plan), cached: false });
  } catch (err) {
    console.error('get-visitor-origins error:', err);
    return createResponse(500, { success: false, error: 'Internal Server Error' });
  }
};
