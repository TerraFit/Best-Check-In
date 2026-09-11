/**
 * GET /.netlify/functions/generate-bi-report
 * Business+ — Business Intelligence Report PDF
 */

import auth from './_auth.cjs';

const headersJson = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const {
  requireBusinessActor,
  requireBusinessPermission,
  resolveTenant,
  authFailure,
} = auth;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headersJson, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: headersJson, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };

  try {
    const actor = requireBusinessActor(event);
    if (!actor.ok) return authFailure(actor, headersJson);

    if (!requireBusinessPermission(actor.principal, 'canExportReports')) {
      return authFailure(
        { status: 403, error: 'Missing permission: canExportReports' },
        headersJson
      );
    }

    const q = event.queryStringParameters || {};
    const tenant = resolveTenant(actor.principal, q.businessId);
    if (!tenant.ok) return authFailure(tenant, headersJson);
    const businessId = tenant.businessId;

    const { buildAnalyticsSummary, fetchBusiness, resolveBusinessPlan } = await import('./lib/analytics/pipeline.js');
    const { assertBiReportAllowed } = await import('./lib/analytics/packageGates.js');
    const { buildBiReportPdfPayload } = await import('./lib/analytics/reportBuilders/businessIntelligence.js');
    const business = await fetchBusiness(businessId);
    if (!business) return { statusCode: 404, headers: headersJson, body: JSON.stringify({ success: false, error: 'Business not found' }) };
    const plan = resolveBusinessPlan(business);
    const gate = assertBiReportAllowed(plan);
    if (!gate.allowed) return { statusCode: 403, headers: headersJson, body: JSON.stringify({ success: false, error: gate.reason, requiredPlan: gate.requiredPlan, upgradeRequired: true }) };
    const summary = await buildAnalyticsSummary({ businessId, dateFrom: q.dateFrom || q.startDate, dateTo: q.dateTo || q.endDate });
    const pdf = buildBiReportPdfPayload(summary);
    const filename = `FastCheckIn-BI-Report-${summary.meta.dateFrom}-${summary.meta.dateTo}.pdf`;
    return { statusCode: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=\"${filename}\"`, 'Access-Control-Allow-Origin': '*' }, isBase64Encoded: true, body: pdf.toString('base64') };
  } catch (err) {
    console.error('generate-bi-report error:', err);
    return { statusCode: 500, headers: headersJson, body: JSON.stringify({ success: false, error: 'Internal Server Error' }) };
  }
};
