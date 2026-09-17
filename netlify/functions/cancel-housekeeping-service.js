// Cancel an active housekeeping service session.
// Cancellation is deliberate, requires a reason, and makes the task available to start again.
// The elapsed service timer is never paused.

import auth from './_auth.cjs';
import rbac from './_rbac.cjs';

const { requireBusinessActor, resolveTenant, authFailure } = auth;
const MANAGEMENT_ROLES = new Set(['team leader', 'supervisor', 'foreman', 'manager', 'director', 'general manager', 'business owner']);

function response(statusCode, headers, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

function isManagement(principal) {
  if (!principal || principal.actorType === 'business') return true;
  const role = String(principal.role || '').trim().toLowerCase();
  const permissions = rbac.resolvePermissions(principal);
  return MANAGEMENT_ROLES.has(role) || permissions.has('canManageHousekeeping') || permissions.has('canAssignHousekeepingTasks');
}

function canCancel(principal) {
  if (!principal) return false;
  return isManagement(principal)
    || rbac.requirePermission(principal, 'canStartHousekeepingTask')
    || rbac.requirePermission(principal, 'canCompleteHousekeepingTask');
}

async function assertEmployeeActive(principal, headers) {
  if (principal.actorType !== 'employee' || !principal.employeeId) return null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !key) return response(500, headers, { success: false, error: 'Server configuration error' });
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(principal.employeeId)}&business_id=eq.${encodeURIComponent(principal.businessId)}&select=id,business_id,status`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
    if (!res.ok) return response(503, headers, { success: false, error: 'Unable to verify employee status' });
    const employee = (await res.json())[0];
    if (!employee) return response(403, headers, { success: false, error: 'Employee account not found' });
    if (String(employee.status || '').toLowerCase() === 'disabled') return response(403, headers, { success: false, error: 'Account has been disabled. Please contact your administrator.', code: 'EMPLOYEE_DISABLED' });
    return null;
  } catch (error) {
    console.error('cancel-housekeeping-service employee verification failed:', error?.message || error);
    return response(503, headers, { success: false, error: 'Unable to verify employee status' });
  }
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return response(405, headers, { success: false, error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return response(400, headers, { success: false, error: 'Invalid JSON body' }); }
  const gate = requireBusinessActor(event);
  if (!gate.ok) return authFailure(gate, headers);
  const principal = gate.principal;
  const employeeFailure = await assertEmployeeActive(principal, headers);
  if (employeeFailure) return employeeFailure;
  if (!canCancel(principal)) return response(403, headers, { success: false, error: 'Missing permission to cancel housekeeping service' });

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) return response(400, headers, { success: false, error: 'Cancellation reason is required', code: 'CANCELLATION_REASON_REQUIRED' });
  if (reason.length > 500) return response(400, headers, { success: false, error: 'Cancellation reason is too long' });
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
    const sessionRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(body.sessionId)}&business_id=eq.${q(businessId)}&status=eq.active&select=id,business_id,housekeeping_task_id,room_id,employee_id,started_at`, { headers: read });
    if (!sessionRes.ok) {
      const text = await sessionRes.text();
      if (/PGRST205|relation .* does not exist|Could not find the table|schema cache/i.test(text)) return response(503, headers, { success: false, error: 'Housekeeping service schema is not installed', code: 'HOUSEKEEPING_SCHEMA_MISSING', relation: 'housekeeping_service_sessions', hint: 'Apply migrations 013, 014, 016 and 017' });
      console.error('cancel-housekeeping-service session lookup failed:', sessionRes.status);
      return response(500, headers, { success: false, error: 'Failed to load service session' });
    }
    const session = (await sessionRes.json())[0];
    if (!session) return response(404, headers, { success: false, error: 'Active service session not found' });

    const management = isManagement(principal);
    if (!management && String(session.employee_id || '') !== String(principal.employeeId || '')) return response(403, headers, { success: false, error: 'Forbidden: service session belongs to another employee' });

    const cancelledAt = new Date().toISOString();
    const sessionUpdate = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(session.id)}&business_id=eq.${q(businessId)}&status=eq.active`, { method: 'PATCH', headers: write, body: JSON.stringify({ status: 'cancelled', completed_at: cancelledAt, cancelled_at: cancelledAt, cancelled_by: principal.employeeId || principal.userId || null, cancellation_reason: reason, updated_at: cancelledAt }) });
    if (!sessionUpdate.ok) {
      const text = await sessionUpdate.text();
      if (/PGRST205|relation .* does not exist|Could not find the table|schema cache/i.test(text)) return response(503, headers, { success: false, error: 'Housekeeping cancellation schema is not installed', code: 'HOUSEKEEPING_CANCELLATION_SCHEMA_MISSING', relation: 'housekeeping_service_sessions', hint: 'Apply docs/migrations/017_housekeeping_service_cancellation.sql' });
      console.error('cancel-housekeeping-service session update failed:', sessionUpdate.status);
      return response(500, headers, { success: false, error: 'Failed to cancel housekeeping service' });
    }
    const cancelledSession = (await sessionUpdate.json())[0];
    if (!cancelledSession) return response(500, headers, { success: false, error: 'Failed to cancel housekeeping service' });

    const taskRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(session.housekeeping_task_id)}&business_id=eq.${q(businessId)}&status=eq.in_progress`, { method: 'PATCH', headers: write, body: JSON.stringify({ status: 'pending', started_at: null, completed_at: null, completed_by: null, updated_at: cancelledAt }) });
    if (!taskRes.ok) {
      console.error('cancel-housekeeping-service task reset failed:', taskRes.status);
      return response(500, headers, { success: false, error: 'Service was cancelled but the housekeeping task could not be reset automatically' });
    }

    await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${q(session.room_id)}&business_id=eq.${q(businessId)}`, { method: 'PATCH', headers: { ...write, Prefer: 'return=minimal' }, body: JSON.stringify({ housekeeping_status: 'dirty', updated_at: cancelledAt }) }).catch((error) => console.warn('cancel-housekeeping-service room status update failed:', error?.message || error));

    return response(200, headers, { success: true, session: cancelledSession, taskStatus: 'pending', cancellationReason: reason });
  } catch (error) {
    console.error('cancel-housekeeping-service fatal:', error?.message || error);
    return response(500, headers, { success: false, error: 'Failed to cancel housekeeping service' });
  }
};
