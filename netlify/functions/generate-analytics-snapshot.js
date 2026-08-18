/**
 * GET /.netlify/functions/generate-analytics-snapshot
 * Pro+ — Analytics Snapshot PDF
 */

const jwt = require('jsonwebtoken');
const headersJson = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headersJson, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: headersJson, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  try {
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) return { statusCode: 401, headers: headersJson, body: JSON.stringify({ success: false, error: 'No authorization token provided' }) };
    let decoded;
    try { decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET); }
    catch (err) { return { statusCode: 401, headers: headersJson, body: JSON.stringify({ success: false, error: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token' }) }; }

    // The signed JWT subject is the authoritative business identity.
    const businessIdFromToken = decoded.sub;
    if (!businessIdFromToken || decoded.role !== 'authenticated') return { statusCode: 403, headers: headersJson, body: JSON.stringify({ success: false, error: 'Token missing authenticated business identity' }) };
    const q = event.queryStringParameters || {};
    const businessId = q.businessId || businessIdFromToken;
    if (businessId !== businessIdFromToken) return { statusCode: 403, headers: headersJson, body: JSON.stringify({ success: false, error: 'Forbidden' }) };

    const { buildAnalyticsSummary, fetchBusiness, resolveBusinessPlan } = await import('./lib/analytics/pipeline.js');
    const { buildRoomPerformance } = await import('./lib/analytics/roomPerformance.js');
    const { assertSnapshotAllowed } = await import('./lib/analytics/packageGates.js');
    const { buildSnapshotPdfPayload } = await import('./lib/analytics/reportBuilders/snapshot.js');
    const business = await fetchBusiness(businessId);
    if (!business) return { statusCode: 404, headers: headersJson, body: JSON.stringify({ success: false, error: 'Business not found' }) };
    const plan = resolveBusinessPlan(business);
    const gate = assertSnapshotAllowed(plan);
    if (!gate.allowed) return { statusCode: 403, headers: headersJson, body: JSON.stringify({ success: false, error: gate.reason, requiredPlan: gate.requiredPlan, upgradeRequired: true }) };
    const dateFrom = q.dateFrom || q.startDate;
    const dateTo = q.dateTo || q.endDate;
    const summary = await buildAnalyticsSummary({ businessId, dateFrom, dateTo });
    let roomPerformance = null;
    try { roomPerformance = await buildRoomPerformance({ businessId, dateFrom, dateTo }); }
    catch (roomError) { console.warn('Snapshot room-performance unavailable:', roomError?.message || roomError); }
    const pdf = await buildSnapshotPdfPayload({ ...summary, roomPerformance });
    const filename = `FastCheckIn-Snapshot-${summary.meta.dateFrom}-${summary.meta.dateTo}.pdf`;
    return { statusCode: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=\"${filename}\"`, 'Access-Control-Allow-Origin': '*' }, isBase64Encoded: true, body: pdf.toString('base64') };
  } catch (err) {
    console.error('generate-analytics-snapshot error:', err);
    return { statusCode: 500, headers: headersJson, body: JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }) };
  }
};
