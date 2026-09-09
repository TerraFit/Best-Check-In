import auth from '../netlify/functions/_auth.cjs';

/**
 * GET /.netlify/functions/generate-analytics-snapshot
 * Pro+ — Analytics Snapshot PDF
 */

const headersJson = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: headersJson,
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headersJson, body: '' };
  if (event.httpMethod !== 'GET') return createResponse(405, { success: false, error: 'Method Not Allowed' });

  try {
    const actor = auth.requireBusinessActor(event);
    if (!actor.ok) return auth.authFailure(actor);

    if (!auth.requireBusinessPermission(actor.principal, 'canViewReports')) {
      return auth.authFailure({ status: 403, error: 'Forbidden' });
    }

    const q = event.queryStringParameters || {};
    const tenant = auth.resolveTenant(actor.principal, q.businessId);
    if (!tenant.ok) return auth.authFailure(tenant);
    const businessId = tenant.businessId;

    const { buildAnalyticsSummary, fetchBusiness, resolveBusinessPlan } = await import('../netlify/functions/lib/analytics/pipeline.js');
    const { buildRoomPerformance } = await import('../netlify/functions/lib/analytics/roomPerformance.js');
    const { assertSnapshotAllowed } = await import('../netlify/functions/lib/analytics/packageGates.js');
    const { buildSnapshotPdfPayload } = await import('../netlify/functions/lib/analytics/reportBuilders/snapshot.js');

    const business = await fetchBusiness(businessId);
    if (!business) return createResponse(404, { success: false, error: 'Business not found' });

    const plan = resolveBusinessPlan(business);
    const gate = assertSnapshotAllowed(plan);
    if (!gate.allowed) {
      return createResponse(403, { success: false, error: gate.reason, requiredPlan: gate.requiredPlan, upgradeRequired: true });
    }

    const dateFrom = q.dateFrom || q.startDate;
    const dateTo = q.dateTo || q.endDate;
    const summary = await buildAnalyticsSummary({ businessId, dateFrom, dateTo });

    let roomPerformance = null;
    try {
      roomPerformance = await buildRoomPerformance({ businessId, dateFrom, dateTo });
    } catch (roomError) {
      console.warn('Snapshot room-performance unavailable:', roomError?.message || roomError);
    }

    const pdf = await buildSnapshotPdfPayload({ ...summary, roomPerformance });
    const filename = `FastCheckIn-Snapshot-${summary.meta.dateFrom}-${summary.meta.dateTo}.pdf`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Access-Control-Allow-Origin': '*' },
      isBase64Encoded: true,
      body: pdf.toString('base64'),
    };
  } catch (err) {
    console.error('generate-analytics-snapshot error:', err);
    return createResponse(500, { success: false, error: 'Internal Server Error' });
  }
};
