// Complete a measured housekeeping service session.
// Actual duration is calculated from persisted timestamps, never from the client timer.
// Authorization is authoritative: identity, role/permission, tenant, and executor scope
// are all established server-side before any write occurs.

import auth from './_auth.cjs';
import rbac from './_rbac.cjs';
const { requireBusinessActor, resolveTenant } = auth;

const MANAGEMENT_ROLES = new Set(['general_manager', 'manager', 'director', 'supervisor', 'team_leader', 'foreman']);

function response(statusCode, headers, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function isManagement(principal) {
  if (!principal || principal.actorType === 'business') return true;
  const role = String(principal.role || '').trim().toLowerCase();
  const permissions = rbac.resolvePermissions(principal);
  return MANAGEMENT_ROLES.has(role)
    || permissions.has('canManageHousekeeping')
    || permissions.has('canAssignHousekeepingTasks');
}

function hasExplicitCompletionPermission(principal) {
  return !!principal
    && principal.actorType === 'employee'
    && Array.isArray(principal.permissions)
    && principal.permissions.includes('canCompleteHousekeepingTask');
}

function parseCount(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return response(405, headers, { error: 'Method Not Allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, headers, { success: false, error: 'Invalid JSON body' });
  }

  try {
    const identity = requireBusinessActor(event);
    if (!identity.ok) return response(identity.status || 401, headers, { success: false, error: identity.error });

    const principal = identity.principal;
    const requestedBusinessId = body?.businessId || null;
    const scope = resolveTenant(principal, requestedBusinessId);
    if (!scope.ok) return response(scope.status, headers, { success: false, error: scope.error });

    if (principal.actorType === 'employee') {
      const employeeRes = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/employees?id=eq.${encodeURIComponent(principal.employeeId)}&business_id=eq.${encodeURIComponent(scope.businessId)}&select=id,business_id,status`,
        { headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, Accept: 'application/json' } }
      );
      if (!employeeRes.ok) return response(503, headers, { success: false, error: 'Unable to verify employee status' });
      const employee = (await employeeRes.json())[0];
      if (!employee) return response(403, headers, { success: false, error: 'Employee account not found' });
      if (String(employee.business_id) !== String(scope.businessId)) return response(403, headers, { success: false, error: 'Forbidden: business scope mismatch' });
      if (String(employee.status || '').toLowerCase() === 'disabled') {
        return response(403, headers, { success: false, error: 'Account has been disabled. Please contact your administrator.', code: 'EMPLOYEE_DISABLED' });
      }
    }

    const management = isManagement(principal);
    const explicitCompletionPermission = hasExplicitCompletionPermission(principal);
    const canComplete = principal.actorType === 'business'
      || management
      || rbac.requirePermission(principal, 'canCompleteHousekeepingTask');
    if (!canComplete) return response(403, headers, { success: false, error: 'Missing permission: canCompleteHousekeepingTask' });

    const sessionId = body?.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      return response(400, headers, { success: false, error: 'sessionId is required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return response(500, headers, { success: false, error: 'Server configuration error' });

    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const q = (v) => encodeURIComponent(v);
    const businessId = scope.businessId;

    const sessionRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}&select=*`,
      { headers: read }
    );
    if (!sessionRes.ok) {
      console.error('complete-housekeeping-service session lookup failed:', sessionRes.status);
      return response(500, headers, { success: false, error: 'Unable to load service session' });
    }

    const session = (await sessionRes.json())[0];
    if (!session) return response(404, headers, { success: false, error: 'Service session not found' });
    if (session.status !== 'active') {
      return response(409, headers, { success: false, error: `Service session is already ${session.status}` });
    }

    if (!management && !explicitCompletionPermission && String(session.employee_id || '') !== String(principal.employeeId || '')) {
      return response(403, headers, { success: false, error: 'Forbidden: service session belongs to another employee' });
    }

    const startedAt = new Date(session.started_at).getTime();
    if (!Number.isFinite(startedAt)) return response(500, headers, { success: false, error: 'Invalid service session timestamp' });

    const completedAt = new Date().toISOString();
    const actualSeconds = Math.max(0, Math.floor((Date.parse(completedAt) - startedAt) / 1000));
    const targetMinutes = Number(session.target_minutes_snapshot);
    const targetSeconds = Number.isFinite(targetMinutes) && targetMinutes >= 0 ? Math.floor(targetMinutes * 60) : 0;

    const checklistCompletedCount = parseCount(body.checklistCompletedCount);
    const checklistTotalCount = parseCount(body.checklistTotalCount);
    const issuesReportedCount = parseCount(body.issuesReportedCount);
    const safeChecklistCompletedCount = checklistTotalCount > 0
      ? Math.min(checklistCompletedCount, checklistTotalCount)
      : checklistCompletedCount;

    const sessionPatch = {
      completed_at: completedAt,
      actual_seconds: actualSeconds,
      status: 'completed',
      checklist_completed_count: safeChecklistCompletedCount,
      checklist_total_count: checklistTotalCount,
      issues_reported_count: issuesReportedCount,
      quality_result: 'pending',
      notes: body.notes ?? session.notes ?? null,
      updated_at: completedAt,
    };

    const updateSessionRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}&status=eq.active`,
      { method: 'PATCH', headers: write, body: JSON.stringify(sessionPatch) }
    );
    if (!updateSessionRes.ok) {
      console.error('complete-housekeeping-service session update failed:', updateSessionRes.status);
      return response(500, headers, { success: false, error: 'Unable to complete service session' });
    }

    const updatedSessions = await updateSessionRes.json();
    if (!Array.isArray(updatedSessions) || updatedSessions.length !== 1) {
      return response(409, headers, { success: false, error: 'Service session could not be completed' });
    }

    const taskRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(session.housekeeping_task_id)}&business_id=eq.${q(businessId)}&select=id,status`,
      {
        method: 'PATCH',
        headers: write,
        body: JSON.stringify({
          status: 'completed',
          completed_at: completedAt,
          inspection_status: 'pending',
          updated_at: completedAt,
        }),
      }
    );
    if (!taskRes.ok) {
      console.error('complete-housekeeping-service task update failed:', taskRes.status);
      await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}&status=eq.completed`,
        { method: 'PATCH', headers: write, body: JSON.stringify({ status: 'active', completed_at: null, actual_seconds: null, updated_at: new Date().toISOString() }) }
      ).catch(() => {});
      return response(500, headers, { success: false, error: 'Unable to complete housekeeping task' });
    }

    const taskRows = await taskRes.json();
    if (!Array.isArray(taskRows) || taskRows.length !== 1) {
      return response(409, headers, { success: false, error: 'Housekeeping task could not be completed' });
    }

    const roomRes = await fetch(
      `${supabaseUrl}/rest/v1/rooms?id=eq.${q(session.room_id)}&business_id=eq.${q(businessId)}`,
      {
        method: 'PATCH',
        headers: { ...write, Prefer: 'return=minimal' },
        body: JSON.stringify({ housekeeping_status: 'awaiting_inspection', updated_at: completedAt }),
      }
    );
    if (!roomRes.ok) console.error('complete-housekeeping-service room status update failed:', roomRes.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session: { ...session, ...sessionPatch },
        performance: {
          actualSeconds,
          targetSeconds,
          varianceSeconds: actualSeconds - targetSeconds,
          overTarget: actualSeconds > targetSeconds,
        },
      }),
    };
  } catch (error) {
    console.error('complete-housekeeping-service fatal:', error?.message || error);
    return response(500, headers, { success: false, error: 'Failed to complete housekeeping service' });
  }
};
