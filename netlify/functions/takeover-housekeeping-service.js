// Take over an active housekeeping service session.
// The previous session remains in history as a cancelled handover.
// The original started_at and checklist state are preserved so takeover cannot reset the measured service time.

import auth from './_auth.cjs';
import rbac from './_rbac.cjs';

const { requireBusinessActor, resolveTenant, authFailure } = auth;
const MANAGEMENT_ROLES = new Set(['team leader', 'supervisor', 'foreman', 'manager', 'director', 'general manager', 'business owner']);

function response(statusCode, headers, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}
function canTakeOver(principal) {
  if (!principal) return false;
  if (principal.actorType === 'business') return true;
  const role = String(principal.role || '').trim().toLowerCase();
  const permissions = rbac.resolvePermissions(principal);
  return MANAGEMENT_ROLES.has(role) || permissions.has('canStartHousekeepingTask');
}
function isManagement(principal) {
  if (!principal || principal.actorType === 'business') return true;
  const role = String(principal.role || '').trim().toLowerCase();
  const permissions = rbac.resolvePermissions(principal);
  return MANAGEMENT_ROLES.has(role) || permissions.has('canManageHousekeeping') || permissions.has('canAssignHousekeepingTasks');
}
async function assertEmployeeActive(principal, headers) {
  if (principal.actorType !== 'employee' || !principal.employeeId) return null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !key) return response(500, headers, { success: false, error: 'Server configuration error' });
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(principal.employeeId)}&business_id=eq.${encodeURIComponent(principal.businessId)}&select=id,business_id,status`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    if (!res.ok) return response(503, headers, { success: false, error: 'Unable to verify employee status' });
    const employee = (await res.json())[0];
    if (!employee) return response(403, headers, { success: false, error: 'Employee account not found' });
    if (String(employee.status || '').toLowerCase() === 'disabled') {
      return response(403, headers, { success: false, error: 'Account has been disabled. Please contact your administrator.', code: 'EMPLOYEE_DISABLED' });
    }
    return null;
  } catch (error) {
    console.error('takeover-housekeeping-service employee verification failed:', error?.message || error);
    return response(503, headers, { success: false, error: 'Unable to verify employee status' });
  }
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return response(405, headers, { success: false, error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return response(400, headers, { success: false, error: 'Invalid JSON body' }); }

  const gate = requireBusinessActor(event);
  if (!gate.ok) return authFailure(gate, headers);
  const principal = gate.principal;
  const employeeFailure = await assertEmployeeActive(principal, headers);
  if (employeeFailure) return employeeFailure;
  if (!canTakeOver(principal)) return response(403, headers, { success: false, error: 'Missing permission: canStartHousekeepingTask' });

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) return response(400, headers, { success: false, error: 'Takeover reason is required', code: 'TAKEOVER_REASON_REQUIRED' });
  if (reason.length > 500) return response(400, headers, { success: false, error: 'Takeover reason is too long' });
  if (!body.sessionId) return response(400, headers, { success: false, error: 'sessionId is required' });

  const scope = resolveTenant(principal, body.businessId || null);
  if (!scope.ok) return authFailure(scope, headers);
  const businessId = scope.businessId;
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !key) return response(500, headers, { success: false, error: 'Server configuration error' });

  const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
  const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const q = (v) => encodeURIComponent(v);

  try {
    const sessionRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(body.sessionId)}&business_id=eq.${q(businessId)}&status=eq.active&select=*`,
      { headers: read }
    );
    if (!sessionRes.ok) return response(500, headers, { success: false, error: 'Failed to load active service session' });
    const session = (await sessionRes.json())[0];
    if (!session) return response(404, headers, { success: false, error: 'Active service session not found' });

    if (!isManagement(principal) && String(session.employee_id || '') === String(principal.employeeId || '')) {
      return response(409, headers, { success: false, error: 'You already own this active service. Use Resume Service instead.', code: 'ALREADY_OWNER' });
    }

    const taskRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(session.housekeeping_task_id)}&business_id=eq.${q(businessId)}&select=id,status,room_id`,
      { headers: read }
    );
    if (!taskRes.ok) return response(500, headers, { success: false, error: 'Failed to load housekeeping task' });
    const task = (await taskRes.json())[0];
    if (!task) return response(404, headers, { success: false, error: 'Housekeeping task not found' });
    if (task.status !== 'in_progress') return response(409, headers, { success: false, error: `Task is no longer in progress (currently ${task.status})`, code: 'TASK_NOT_IN_PROGRESS' });

    const takeoverAt = new Date().toISOString();
    const newSessionPayload = {
      business_id: businessId,
      housekeeping_task_id: session.housekeeping_task_id,
      room_id: session.room_id,
      booking_id: session.booking_id || null,
      employee_id: principal.employeeId || principal.userId || null,
      employee_name: principal.employeeName || null,
      service_type: session.service_type,
      room_type_snapshot: session.room_type_snapshot || null,
      target_minutes_snapshot: session.target_minutes_snapshot,
      warning_minutes_snapshot: session.warning_minutes_snapshot,
      started_at: session.started_at,
      status: 'active',
      checklist_completed_count: session.checklist_completed_count || 0,
      checklist_total_count: session.checklist_total_count || 0,
      issues_reported_count: session.issues_reported_count || 0,
      quality_result: 'pending',
      checklist_state: session.checklist_state || {},
      notes: session.notes || null,
      timer_config: session.timer_config || null,
      takeover_from_session_id: session.id,
      takeover_reason: reason,
      taken_over_at: takeoverAt,
      taken_over_by: principal.employeeId || principal.userId || null,
    };

    const newSessionRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions`, {
      method: 'POST',
      headers: write,
      body: JSON.stringify(newSessionPayload),
    });
    if (!newSessionRes.ok) {
      const text = await newSessionRes.text();
      if (/PGRST205|relation .* does not exist|schema cache/i.test(text)) {
        return response(503, headers, { success: false, error: 'Housekeeping takeover schema is not installed', code: 'HOUSEKEEPING_TAKEOVER_SCHEMA_MISSING', hint: 'Apply migration 018_housekeeping_service_takeover.sql' });
      }
      console.error('takeover-housekeeping-service new session failed:', newSessionRes.status);
      return response(500, headers, { success: false, error: 'Failed to create takeover service session' });
    }
    const newSession = (await newSessionRes.json())[0];
    if (!newSession) return response(500, headers, { success: false, error: 'Failed to create takeover service session' });

    const oldSessionUpdate = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(session.id)}&business_id=eq.${q(businessId)}&status=eq.active`,
      {
        method: 'PATCH',
        headers: write,
        body: JSON.stringify({
          status: 'cancelled',
          completed_at: takeoverAt,
          cancelled_at: takeoverAt,
          cancelled_by: principal.employeeId || principal.userId || null,
          cancellation_reason: `Taken over: ${reason}`,
          updated_at: takeoverAt,
        }),
      }
    );
    if (!oldSessionUpdate.ok) {
      await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(newSession.id)}&business_id=eq.${q(businessId)}&status=eq.active`, {
        method: 'PATCH',
        headers: write,
        body: JSON.stringify({
          status: 'cancelled',
          completed_at: takeoverAt,
          cancelled_at: takeoverAt,
          cancelled_by: principal.employeeId || principal.userId || null,
          cancellation_reason: 'Takeover could not be completed because the previous session could not be closed.',
          updated_at: takeoverAt,
        }),
      }).catch(() => {});
      return response(409, headers, { success: false, error: 'The service changed while it was being taken over. Please refresh and try again.', code: 'TAKEOVER_CONFLICT' });
    }

    return response(200, headers, {
      success: true,
      session: newSession,
      previousSession: { id: session.id, employee_id: session.employee_id, employee_name: session.employee_name, started_at: session.started_at },
      taskStatus: 'in_progress',
      takeoverReason: reason,
    });
  } catch (error) {
    console.error('takeover-housekeeping-service fatal:', error?.message || error);
    return response(500, headers, { success: false, error: 'Failed to take over housekeeping service' });
  }
};
