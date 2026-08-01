/**
 * GET /.netlify/functions/get-analytics-summary
 * Query: businessId, dateFrom?, dateTo?
 * Returns KPIs, origins, referrals, LOS, travel patterns for Reports + PDFs.
 * Auth: Bearer JWT (business)
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

const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

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

    const dateFrom = q.dateFrom || q.startDate || null;
    const dateTo = q.dateTo || q.endDate || null;

    const { buildAnalyticsSummary, resolveBusinessPlan, fetchBusiness } = await import(
      './lib/analytics/pipeline.js'
    );
    const { getAnalyticsPlanLimits } = await import('./lib/analytics/packageGates.js');

    const business = await fetchBusiness(businessId);
    if (!business) {
      return createResponse(404, { success: false, error: 'Business not found' });
    }
    const plan = resolveBusinessPlan(business);
    const limits = getAnalyticsPlanLimits(plan);

    const key = JSON.stringify({ businessId, dateFrom, dateTo, type: 'summary' });
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return createResponse(200, {
        success: true,
        ...hit.data,
        limits,
        cached: true,
      });
    }

    const data = await buildAnalyticsSummary({ businessId, dateFrom, dateTo });

    // Strip deep origin detail for Starter (static overview only)
    if (!limits.canInteractiveMap) {
      data.originCountries = data.originCountries.slice(0, 5);
    }

    cache.set(key, { at: Date.now(), data });

    return createResponse(200, {
      success: true,
      ...data,
      limits,
      cached: false,
    });
  } catch (err) {
    console.error('get-analytics-summary error:', err);
    const status = err.statusCode || 500;
    return createResponse(status, {
      success: false,
      error: err.message || 'Internal Server Error',
    });
  }
};
