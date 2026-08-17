/**
 * GET /.netlify/functions/get-visitor-origins
 * Query: businessId, dateFrom?, dateTo?, level, continent?, country?, region?, city?
 * Auth: Bearer JWT (business)
 * Package limits enforced server-side.
 */

const jwt = require('jsonwebtoken');

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

// Simple in-memory cache (cold starts reset)
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

function cacheKey(params) {
  return JSON.stringify(params);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});
  if (event.httpMethod !== 'GET') {
    return createResponse(405, { success: false, error: 'Method Not Allowed' });
  }

  try {
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return createResponse(401, { success: false, error: 'No authorization token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return createResponse(401, { success: false, error: 'Token has expired' });
      }
      return createResponse(401, { success: false, error: 'Invalid token signature' });
    }

    const businessIdFromToken = decoded.user_metadata?.business_id;
    if (!businessIdFromToken) {
      return createResponse(403, { success: false, error: 'Token missing business ID' });
    }

    const q = event.queryStringParameters || {};
    const businessId = q.businessId || businessIdFromToken;
    if (q.businessId && q.businessId !== businessIdFromToken) {
      return createResponse(403, { success: false, error: 'Forbidden' });
    }

    const level = (q.level || 'world').toLowerCase();
    const dateFrom = q.dateFrom || q.startDate || null;
    const dateTo = q.dateTo || q.endDate || null;
    const continent = q.continent || null;
    const country = q.country || null;
    const region = q.region || null;
    const city = q.city || null;

    const { buildVisitorOrigins, fetchBusiness, resolveBusinessPlan } = await import(
      './lib/analytics/pipeline.js'
    );
    const { assertDrillAllowed, getAnalyticsPlanLimits } = await import(
      './lib/analytics/packageGates.js'
    );

    const business = await fetchBusiness(businessId);
    if (!business) {
      return createResponse(404, { success: false, error: 'Business not found' });
    }
    const plan = resolveBusinessPlan(business);
    const gate = assertDrillAllowed(plan, level);

    if (!gate.allowed) {
      return createResponse(403, {
        success: false,
        error: gate.reason,
        requiredPlan: gate.requiredPlan,
        limits: gate.limits,
        upgradeRequired: true,
      });
    }

    const key = cacheKey({
      businessId,
      dateFrom,
      dateTo,
      level,
      continent,
      country,
      region,
      city,
    });
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return createResponse(200, {
        success: true,
        ...hit.data,
        limits: getAnalyticsPlanLimits(plan),
        cached: true,
      });
    }

    const data = await buildVisitorOrigins({
      businessId,
      dateFrom,
      dateTo,
      level,
      continent,
      country,
      region,
      city,
    });

    // The GeoJSON map is country-based even at world/continent views.
    // Keep the requested hierarchy level for metadata, but supply real country
    // nodes to the map so a country polygon receives a value only when that
    // country actually exists in the analytics aggregation. Never derive a
    // country value from its continent aggregate.
    if (level === 'world' || level === 'continent') {
      const countryData = await buildVisitorOrigins({
        businessId,
        dateFrom,
        dateTo,
        level: 'country',
        continent: level === 'continent' ? continent : null,
        country: null,
        region: null,
        city: null,
      });
      data.nodes = countryData.nodes || [];
    }

    cache.set(key, { at: Date.now(), data });

    return createResponse(200, {
      success: true,
      ...data,
      limits: getAnalyticsPlanLimits(plan),
      cached: false,
    });
  } catch (err) {
    console.error('get-visitor-origins error:', err);
    const status = err.statusCode || 500;
    return createResponse(status, {
      success: false,
      error: err.message || 'Internal Server Error',
    });
  }
};
