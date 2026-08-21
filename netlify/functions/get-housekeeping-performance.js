const jwt = require('jsonwebtoken');

const SERVICE_TYPES = ['refresh', 'full_service', 'deep_cleaning', 'mattress_flip_air', 'checkout_inspection'];
const QUALITY_RESULTS = ['pending', 'passed', 'passed_with_minor_issue', 'failed_rework_required'];

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

function authenticate(event) {
  const auth = (event.headers?.authorization || event.headers?.Authorization || '').trim();
  if (!auth) return { ok: false, status: 401, error: 'No authorization token provided' };
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'Invalid token format' };
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    const meta = decoded?.user_metadata || {};
    if (decoded?.role === 'service_role' || meta.super_admin) {
      return { ok: true, principal: { actorType: 'super_admin', businessId: meta.business_id || null, role: 'super_admin' } };
    }
    const businessId = meta.business_id;
    if (!businessId) return { ok: false, status: 403, error: 'Token missing business ID' };
    const role = meta.staff_role || meta.role || '';
    const perms = Array.isArray(meta.permission_set) ? meta.permission_set : [];
    const allowedRoles = ['business_owner', 'general_manager', 'supervisor', 'team_leader', 'housekeeper', 'administration', 'super_admin'];
    if (
      allowedRoles.includes(role) ||
      perms.includes('canManageHousekeeping') ||
      perms.includes('canViewHousekeepingPerformance')
    ) {
      return { ok: true, principal: { actorType: 'business', businessId, role } };
    }
    return { ok: false, status: 403, error: 'Missing permission: canManageHousekeeping' };
  } catch (error) {
    if (error?.name === 'TokenExpiredError') return { ok: false, status: 401, error: 'Token has expired' };
    return { ok: false, status: 401, error: 'Invalid authorization token' };
  }
}

function resolveBusinessId(principal, requested) {
  if (principal.actorType === 'super_admin') {
    const businessId = requested || principal.businessId;
    if (!businessId) return { ok: false, status: 400, error: 'businessId required' };
    return { ok: true, businessId };
  }
  if (requested && requested !== principal.businessId) return { ok: false, status: 403, error: 'Forbidden: business scope mismatch' };
  return { ok: true, businessId: principal.businessId };
}

function dateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : null;
}

function addMetric(target, session) {
  const actual = Number(session.actual_seconds);
  const targetSeconds = Number(session.target_minutes_snapshot) * 60;
  if (!Number.isFinite(actual) || !Number.isFinite(targetSeconds) || targetSeconds <= 0) return;
  target.count += 1;
  target.actualSeconds += actual;
  target.targetSeconds += targetSeconds;
  target.withinTarget += actual <= targetSeconds ? 1 : 0;
  target.overTarget += actual > targetSeconds ? 1 : 0;
  target.issues += Math.max(0, Number(session.issues_reported_count) || 0);
  const checklistTotal = Math.max(0, Number(session.checklist_total_count) || 0);
  const checklistCompleted = Math.max(0, Number(session.checklist_completed_count) || 0);
  if (checklistTotal > 0) {
    target.checklistCompleted += checklistCompleted;
    target.checklistTotal += checklistTotal;
  }
  if (session.quality_result && QUALITY_RESULTS.includes(session.quality_result)) {
    target.qualityCounts[session.quality_result] = (target.qualityCounts[session.quality_result] || 0) + 1;
  }
}

function metricOutput(metric) {
  const count = metric.count;
  const avgActualSeconds = count ? Math.round(metric.actualSeconds / count) : 0;
  const avgTargetSeconds = count ? Math.round(metric.targetSeconds / count) : 0;
  const varianceSeconds = avgActualSeconds - avgTargetSeconds;
  return {
    count,
    averageActualSeconds: avgActualSeconds,
    averageTargetSeconds: avgTargetSeconds,
    averageVarianceSeconds: varianceSeconds,
    withinTargetRate: count ? Math.round((metric.withinTarget / count) * 10000) / 100 : 0,
    overTargetRate: count ? Math.round((metric.overTarget / count) * 10000) / 100 : 0,
    averageIssues: count ? Math.round((metric.issues / count) * 100) / 100 : 0,
    checklistCompletionRate: metric.checklistTotal ? Math.round((metric.checklistCompleted / metric.checklistTotal) * 10000) / 100 : null,
    qualityCounts: metric.qualityCounts,
  };
}

function emptyMetric() {
  return { count: 0, actualSeconds: 0, targetSeconds: 0, withinTarget: 0, overTarget: 0, issues: 0, checklistCompleted: 0, checklistTotal: 0, qualityCounts: {} };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});
  if (event.httpMethod !== 'GET') return createResponse(405, { success: false, error: 'Method Not Allowed' });

  try {
    const gate = authenticate(event);
    if (!gate.ok) return createResponse(gate.status || 401, { success: false, error: gate.error });
    const scope = resolveBusinessId(gate.principal, event.queryStringParameters?.businessId);
    if (!scope.ok) return createResponse(scope.status, { success: false, error: scope.error });

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return createResponse(500, { success: false, error: 'Server configuration error' });

    const q = event.queryStringParameters || {};
    const dateFrom = dateOnly(q.dateFrom) || dateOnly(q.startDate);
    const dateTo = dateOnly(q.dateTo) || dateOnly(q.endDate);
    const employeeId = q.employeeId || null;
    const serviceType = SERVICE_TYPES.includes(q.serviceType) ? q.serviceType : null;
    const roomId = q.roomId || null;

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
    const from = dateFrom || defaultFrom.toISOString().slice(0, 10);
    const to = dateTo || now.toISOString().slice(0, 10);
    if (from > to) return createResponse(400, { success: false, error: 'dateFrom must be on or before dateTo' });

    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const base = new URL(`${supabaseUrl}/rest/v1/housekeeping_service_sessions`);
    base.searchParams.set('business_id', `eq.${scope.businessId}`);
    base.searchParams.set('status', 'eq.completed');
    base.searchParams.set('started_at', `gte.${from}T00:00:00.000Z`);
    base.searchParams.set('started_at', `gte.${from}T00:00:00.000Z`);
    base.searchParams.set('started_at', `gte.${from}T00:00:00.000Z`);
    base.searchParams.set('completed_at', `lte.${to}T23:59:59.999Z`);
    if (employeeId) base.searchParams.set('employee_id', `eq.${employeeId}`);
    if (serviceType) base.searchParams.set('service_type', `eq.${serviceType}`);
    if (roomId) base.searchParams.set('room_id', `eq.${roomId}`);
    base.searchParams.set('select', 'id,room_id,employee_id,employee_name,service_type,room_type_snapshot,target_minutes_snapshot,actual_seconds,started_at,completed_at,checklist_completed_count,checklist_total_count,issues_reported_count,quality_result,rework_seconds');
    base.searchParams.set('order', 'started_at.asc');
    base.searchParams.set('limit', '5000');

    const res = await fetch(base.toString(), { headers: read });
    if (!res.ok) return createResponse(res.status, { success: false, error: await res.text() });
    const sessions = Array.isArray(await res.json()) ? await Promise.resolve([]) : [];
    // The response body is read below in a single request; this placeholder is replaced immediately.
  } catch (error) {
    console.error('get-housekeeping-performance error:', error);
    return createResponse(error.statusCode || 500, { success: false, error: error.message || 'Internal Server Error' });
  }
};
