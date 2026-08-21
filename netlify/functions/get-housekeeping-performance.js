const {
  authenticateHousekeepingService,
  resolveBusinessId,
  schemaMissingResponse,
} = require('./_housekeepingServiceAuth');

const SERVICE_TYPES = ['refresh', 'full_service', 'deep_cleaning', 'mattress_flip_air', 'checkout_inspection'];
const QUALITY_RESULTS = ['pending', 'passed', 'passed_with_minor_issue', 'failed_rework_required'];
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const response = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

function metric() {
  return { count: 0, actual: 0, target: 0, within: 0, over: 0, issues: 0, checklistDone: 0, checklistTotal: 0, quality: {} };
}
function add(m, s) {
  const actual = Number(s.actual_seconds);
  const target = Number(s.target_minutes_snapshot) * 60;
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) return false;
  m.count++;
  m.actual += actual;
  m.target += target;
  m.within += actual <= target ? 1 : 0;
  m.over += actual > target ? 1 : 0;
  m.issues += Math.max(0, Number(s.issues_reported_count) || 0);
  const total = Math.max(0, Number(s.checklist_total_count) || 0);
  const done = Math.min(total, Math.max(0, Number(s.checklist_completed_count) || 0));
  m.checklistDone += done;
  m.checklistTotal += total;
  if (QUALITY_RESULTS.includes(s.quality_result)) {
    m.quality[s.quality_result] = (m.quality[s.quality_result] || 0) + 1;
  }
  return true;
}
function out(m) {
  const n = m.count;
  const actual = n ? Math.round(m.actual / n) : 0;
  const target = n ? Math.round(m.target / n) : 0;
  return {
    count: n,
    averageActualSeconds: actual,
    averageTargetSeconds: target,
    averageVarianceSeconds: actual - target,
    withinTargetRate: n ? Math.round((m.within / n) * 10000) / 100 : 0,
    overTargetRate: n ? Math.round((m.over / n) * 10000) / 100 : 0,
    averageIssues: n ? Math.round((m.issues / n) * 100) / 100 : 0,
    checklistCompletionRate: m.checklistTotal
      ? Math.round((m.checklistDone / m.checklistTotal) * 10000) / 100
      : null,
    qualityCounts: m.quality,
  };
}
function dateOnly(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'GET') return response(405, { success: false, error: 'Method Not Allowed' });
  try {
    const gate = authenticateHousekeepingService(event, 'view_performance');
    if (!gate.ok) return response(gate.status, { success: false, error: gate.error });

    const q = event.queryStringParameters || {};
    const scope = resolveBusinessId(gate.principal, q.businessId || null);
    if (!scope.ok) return response(scope.status, { success: false, error: scope.error });
    const businessId = scope.businessId;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return response(500, { success: false, error: 'Server configuration error' });

    const now = new Date();
    const fallback = new Date(now);
    fallback.setUTCDate(fallback.getUTCDate() - 29);
    const from = dateOnly(q.dateFrom || q.startDate) || fallback.toISOString().slice(0, 10);
    const to = dateOnly(q.dateTo || q.endDate) || now.toISOString().slice(0, 10);
    if (from > to) return response(400, { success: false, error: 'dateFrom must be on or before dateTo' });

    const params = new URLSearchParams();
    params.set('business_id', `eq.${businessId}`);
    params.set('status', 'eq.completed');
    params.set('started_at', `gte.${from}T00:00:00.000Z`);
    params.set('completed_at', `lte.${to}T23:59:59.999Z`);
    if (q.employeeId) params.set('employee_id', `eq.${q.employeeId}`);
    if (SERVICE_TYPES.includes(q.serviceType)) params.set('service_type', `eq.${q.serviceType}`);
    if (q.roomId) params.set('room_id', `eq.${q.roomId}`);
    params.set(
      'select',
      'id,room_id,employee_id,employee_name,service_type,target_minutes_snapshot,actual_seconds,started_at,completed_at,checklist_completed_count,checklist_total_count,issues_reported_count,quality_result,rework_seconds'
    );
    params.set('order', 'started_at.asc');
    params.set('limit', '5000');

    const res = await fetch(`${url}/rest/v1/housekeeping_service_sessions?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text();
      const missing = schemaMissingResponse(res.status, text, 'housekeeping_service_sessions');
      if (missing) return response(503, missing);
      return response(res.status, { success: false, error: text });
    }
    const sessions = await res.json();
    if (!Array.isArray(sessions)) {
      return response(500, { success: false, error: 'Invalid performance data response' });
    }

    const overall = metric();
    const employees = new Map();
    const services = new Map();
    const rooms = new Map();
    const days = new Map();
    let skipped = 0;
    for (const s of sessions) {
      if (!add(overall, s)) {
        skipped++;
        continue;
      }
      const employeeKey = s.employee_id || `name:${s.employee_name || 'Unassigned'}`;
      if (!employees.has(employeeKey)) {
        employees.set(employeeKey, {
          employeeId: s.employee_id || null,
          employeeName: s.employee_name || 'Unassigned',
          metric: metric(),
        });
      }
      add(employees.get(employeeKey).metric, s);
      const serviceKey = s.service_type || 'unknown';
      if (!services.has(serviceKey)) services.set(serviceKey, metric());
      add(services.get(serviceKey), s);
      const roomKey = s.room_id || 'unassigned';
      if (!rooms.has(roomKey)) rooms.set(roomKey, { roomId: s.room_id || null, metric: metric() });
      add(rooms.get(roomKey).metric, s);
      const day = String(s.started_at || '').slice(0, 10) || 'unknown';
      if (!days.has(day)) days.set(day, metric());
      add(days.get(day), s);
    }

    const byEmployee = [...employees.values()]
      .map((x) => ({ employeeId: x.employeeId, employeeName: x.employeeName, ...out(x.metric) }))
      .sort((a, b) => b.count - a.count || a.averageVarianceSeconds - b.averageVarianceSeconds);
    const byServiceType = [...services.entries()]
      .map(([serviceType, m]) => ({ serviceType, ...out(m) }))
      .sort((a, b) => b.count - a.count);
    const byRoom = [...rooms.values()]
      .map((x) => ({ roomId: x.roomId, ...out(x.metric) }))
      .sort((a, b) => b.count - a.count);
    const daily = [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, m]) => ({ date, ...out(m) }));
    const quality = overall.quality;
    const qualityCount =
      (quality.passed || 0) + (quality.passed_with_minor_issue || 0) + (quality.failed_rework_required || 0);
    const reworkCount = quality.failed_rework_required || 0;
    const reworkSeconds = sessions.reduce((sum, s) => sum + Math.max(0, Number(s.rework_seconds) || 0), 0);

    return response(200, {
      success: true,
      meta: {
        businessId,
        dateFrom: from,
        dateTo: to,
        generatedAt: new Date().toISOString(),
        source: 'housekeeping_service_sessions',
        completedSessionsReturned: sessions.length,
        skippedSessionsWithoutValidTiming: skipped,
      },
      summary: {
        ...out(overall),
        qualityPassRate: qualityCount ? Math.round(((quality.passed || 0) / qualityCount) * 10000) / 100 : null,
        reworkCount,
        totalReworkSeconds: reworkSeconds,
      },
      byEmployee,
      byServiceType,
      byRoom,
      daily,
    });
  } catch (error) {
    console.error('get-housekeeping-performance error:', error);
    return response(error.statusCode || 500, { success: false, error: error.message || 'Internal Server Error' });
  }
};
