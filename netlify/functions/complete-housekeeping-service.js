// Complete a measured housekeeping service session.
// Actual duration is calculated from persisted timestamps, never from the client timer.
// Auth required (fail closed). business_id is bound from JWT.

const jwt = require('jsonwebtoken');

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
    if (allowedRoles.includes(role) || perms.includes('canCompleteHousekeepingTask') || perms.includes('canManageHousekeeping')) {
      return { ok: true, principal: { actorType: 'business', businessId, role } };
    }
    return { ok: false, status: 403, error: 'Missing permission: canCompleteHousekeepingTask' };
  } catch (error) {
    if (error?.name === 'TokenExpiredError') return { ok: false, status: 401, error: 'Token has expired' };
    return { ok: false, status: 401, error: 'Invalid authorization token' };
  }
}

function resolveBusinessId(principal, bodyBusinessId) {
  if (principal.actorType === 'super_admin') {
    const id = bodyBusinessId || principal.businessId;
    if (!id) return { ok: false, status: 400, error: 'businessId required' };
    return { ok: true, businessId: id };
  }
  if (bodyBusinessId && bodyBusinessId !== principal.businessId) return { ok: false, status: 403, error: 'Forbidden: business scope mismatch' };
  return { ok: true, businessId: principal.businessId };
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    const gate = authenticate(event);
    if (!gate.ok) return { statusCode: gate.status || 401, headers, body: JSON.stringify({ error: gate.error }) };
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    const body = JSON.parse(event.body || '{}');
    const { businessId: requestedBusinessId, sessionId, checklistCompletedCount = 0, checklistTotalCount = 0, issuesReportedCount = 0, notes } = body;
    const scope = resolveBusinessId(gate.principal, requestedBusinessId);
    if (!scope.ok) return { statusCode: scope.status, headers, body: JSON.stringify({ error: scope.error }) };
    if (!sessionId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'sessionId is required' }) };

    const businessId = scope.businessId;
    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const q = (v) => encodeURIComponent(v);
    const sessionRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}&select=*`, { headers: read });
    if (!sessionRes.ok) return { statusCode: sessionRes.status, headers, body: JSON.stringify({ error: await sessionRes.text() }) };
    const session = (await sessionRes.json())[0];
    if (!session) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Service session not found' }) };
    if (session.status !== 'active') return { statusCode: 409, headers, body: JSON.stringify({ error: `Service session is already ${session.status}`, session }) };

    const completedAt = new Date().toISOString();
    const actualSeconds = Math.max(0, Math.floor((new Date(completedAt).getTime() - new Date(session.started_at).getTime()) / 1000));
    const targetSeconds = Number(session.target_minutes_snapshot) * 60;
    const sessionPatch = {
      completed_at: completedAt,
      actual_seconds: actualSeconds,
      status: 'completed',
      checklist_completed_count: Math.max(0, Number(checklistCompletedCount) || 0),
      checklist_total_count: Math.max(0, Number(checklistTotalCount) || 0),
      issues_reported_count: Math.max(0, Number(issuesReportedCount) || 0),
      quality_result: 'pending',
      notes: notes ?? session.notes ?? null,
      updated_at: completedAt,
    };
    const updateSessionRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}`, { method: 'PATCH', headers: write, body: JSON.stringify(sessionPatch) });
    if (!updateSessionRes.ok) return { statusCode: updateSessionRes.status, headers, body: JSON.stringify({ error: await updateSessionRes.text() }) };

    const taskRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(session.housekeeping_task_id)}&business_id=eq.${q(businessId)}`, { method: 'PATCH', headers: write, body: JSON.stringify({ status: 'completed', completed_at: completedAt, inspection_status: 'pending', updated_at: completedAt }) });
    if (!taskRes.ok) return { statusCode: taskRes.status, headers, body: JSON.stringify({ error: await taskRes.text() }) };
    await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${q(session.room_id)}&business_id=eq.${q(businessId)}`, { method: 'PATCH', headers: { ...write, Prefer: 'return=minimal' }, body: JSON.stringify({ housekeeping_status: 'awaiting_inspection', updated_at: completedAt }) });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, session: { ...session, ...sessionPatch }, performance: { actualSeconds, targetSeconds, varianceSeconds: actualSeconds - targetSeconds, overTarget: actualSeconds > targetSeconds } }) };
  } catch (error) {
    console.error('complete-housekeeping-service fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Failed to complete housekeeping service' }) };
  }
};
