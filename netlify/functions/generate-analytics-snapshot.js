/**
 * GET /.netlify/functions/generate-analytics-snapshot
 * Pro+ — Analytics Snapshot PDF
 */

import auth from './_auth.cjs';
import { buildAnalyticsSummary, fetchBusiness, resolveBusinessPlan } from './lib/analytics/pipeline.js';
import { buildRoomPerformance } from './lib/analytics/roomPerformance.js';
import { assertSnapshotAllowed } from './lib/analytics/packageGates.js';
import { buildSnapshotPdfPayload } from './lib/analytics/reportBuilders/snapshot.js';

const {
  requireBusinessActor,
  requireBusinessPermission,
  resolveTenant,
  authFailure,
} = auth;

const headersJson = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

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
    const business = await fetchBusiness(businessId);
    if (!business) return { statusCode: 404, headers: headersJson, body: JSON.stringify({ success: false, error: 'Business not found' }) };
    const plan = resolveBusinessPlan(business);
    const gate = assertSnapshotAllowed(plan);
    if (!gate.allowed) return { statusCode: 403, headers: headersJson, body: JSON.stringify({ success: false, error: gate.reason, requiredPlan: gate.requiredPlan, upgradeRequired: true }) };
    const dateFrom = q.dateFrom || q.startDate;
    const dateTo = q.dateTo || q.endDate;
    const summary = await buildAnalyticsSummary({ businessId, dateFrom, dateTo });
    let financials = null;
    if (q.includeFinancials !== 'false') {
      const financialUrl = `${process.env.SUPABASE_URL}/rest/v1/analytics_financial_inputs?select=revenue,cost_of_sale,operating_costs,updated_at&business_id=eq.${encodeURIComponent(businessId)}&date_from=eq.${encodeURIComponent(dateFrom)}&date_to=eq.${encodeURIComponent(dateTo)}&limit=1`;
      const financialResponse = await fetch(financialUrl, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      });
      if (!financialResponse.ok) throw new Error(`Supabase REST error ${financialResponse.status}: ${await financialResponse.text()}`);
      const rows = await financialResponse.json();
      if (rows[0]) {
        financials = {
          revenue: rows[0].revenue == null ? null : Number(rows[0].revenue),
          costOfSale: rows[0].cost_of_sale == null ? null : Number(rows[0].cost_of_sale),
          operatingCosts: rows[0].operating_costs == null ? null : Number(rows[0].operating_costs),
          updatedAt: rows[0].updated_at || null,
        };
      }
    }
    let roomPerformance = null;
    try { roomPerformance = await buildRoomPerformance({ businessId, dateFrom, dateTo }); }
    catch (roomError) { console.warn('Snapshot room-performance unavailable:', roomError?.message || roomError); }
    const pdf = await buildSnapshotPdfPayload({ ...summary, roomPerformance, financials });
    const filename = `FastCheckIn-Snapshot-${summary.meta.dateFrom}-${summary.meta.dateTo}.pdf`;
    return { statusCode: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=\"${filename}\"`, 'Access-Control-Allow-Origin': '*' }, isBase64Encoded: true, body: pdf.toString('base64') };
  } catch (err) {
    console.error('generate-analytics-snapshot error:', err);
    return { statusCode: 500, headers: headersJson, body: JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }) };
  }
};
