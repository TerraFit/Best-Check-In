// netlify/functions/update-housekeeping-task.js
// Authoritative server-side authentication, authorization, and tenant binding.

import auth from './_auth.cjs';
import rbac from './_rbac.js';

const { requireBusinessActor, resolveTenant, authFailure } = auth;
const { resolvePermissions, normalizeRole } = rbac;

const STATUS_PERMISSIONS = Object.freeze({
  in_progress: 'canStartHousekeepingTask',
  completed: 'canCompleteHousekeepingTask',
  skipped: 'canCompleteHousekeepingTask',
});

const MANAGE_ROLES = new Set(['team_leader', 'supervisor', 'foreman', 'manager', 'general_manager', 'business_owner']);

function principalPermissions(principal) {
  return resolvePermissions({
    actorType: principal?.actorType,
    role: principal?.role,
    permission_set: principal?.permissions,
    permissions: principal?.permissions,
    active: principal?.active,
  });
}

function hasPermission(principal, permission) {
  if (!principal) return false;
  if (principal.actorType === 'business') return true;
  return principalPermissions(principal).has(permission);
}

export function canOverrideTaskExecution(principal, task) {
  if (!principal || !task) return false;
  if (principal.actorType === 'business') return true;
  const permissions = principalPermissions(principal);
  const normalizedRole = normalizeRole(principal.role);
  if (MANAGE_ROLES.has(normalizedRole)) return true;
  if (permissions.has('canManageHousekeeping')) return true;
  return String(task.assigned_staff_id || '') === String(principal.employeeId || '');
}

async function verifyAssignedEmployee(businessId, employeeId) {
  if (employeeId == null || employeeId === '') return { ok: true };
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !key) return { ok: false, status: 500, error: 'Server configuration error' };
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(employeeId)}&business_id=eq.${encodeURIComponent(businessId)}&select=id,business_id,status`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } },
    );
    if (!res.ok) return { ok: false, status: 500, error: 'Unable to validate assigned employee' };
    const row = (await res.json())[0];
    if (!row) return { ok: false, status: 403, error: 'Assigned employee is outside the business scope' };
    if (String(row.status || '').toLowerCase() === 'disabled') return { ok: false, status: 403, error: 'Assigned employee is disabled' };
    return { ok: true };
  } catch (error) {
    console.error('assigned employee validation failed:', error?.message || error);
    return { ok: false, status: 500, error: 'Unable to validate assigned employee' };
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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const {
      businessId: requestedBusinessId, taskId, status, notes,
      assigned_staff_id, assigned_staff_name, inspection_status,
    } = body;
    if (!taskId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'taskId required' }) };

    const authResult = requireBusinessActor(event);
    if (!authResult.ok) return authFailure(authResult, headers);
    const principal = authResult.principal;

    let mode = 'view';
    if (status === 'in_progress' || status === 'completed' || status === 'skipped') mode = 'execute';
    else if (inspection_status === 'approved' || inspection_status === 'rejected') mode = 'manage';
    else if (assigned_staff_id !== undefined || assigned_staff_name !== undefined) mode = 'assign';

    const permission = mode === 'execute'
      ? STATUS_PERMISSIONS[status]
      : mode === 'manage'
        ? 'canApproveInspection'
        : mode === 'assign'
          ? 'canAssignHousekeepingTasks'
          : 'canViewHousekeeping';

    if (!hasPermission(principal, permission)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: `Missing permission: ${permission}` }) };
    }

    const scope = resolveTenant(principal, requestedBusinessId || null);
    if (!scope.ok) return { statusCode: scope.status, headers, body: JSON.stringify({ error: scope.error }) };
    const businessId = scope.businessId;

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    const restHeaders = {
      apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      Prefer: 'return=representation', Accept: 'application/json',
    };
    const taskRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${encodeURIComponent(taskId)}&business_id=eq.${encodeURIComponent(businessId)}&select=*`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } },
    );
    if (!taskRes.ok) {
      console.error('housekeeping task lookup failed:', taskRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to load housekeeping task' }) };
    }
    const task = (await taskRes.json())[0];
    if (!task) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Task not found' }) };

    if (mode === 'execute' && !canOverrideTaskExecution(principal, task)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: task is assigned to another employee' }) };
    }

    if (status === 'skipped' && (task.task_type !== 'refresh' || task.is_checkout)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Only non-checkout Refresh tasks can be skipped' }) };
    }

    if (mode === 'assign' && assigned_staff_id !== undefined) {
      const employeeCheck = await verifyAssignedEmployee(businessId, assigned_staff_id);
      if (!employeeCheck.ok) return { statusCode: employeeCheck.status || 500, headers, body: JSON.stringify({ error: employeeCheck.error }) };
    }

    const patch = { updated_at: new Date().toISOString() };
    if (status) patch.status = status;
    if (notes !== undefined) patch.notes = notes;
    if (assigned_staff_id !== undefined) patch.assigned_staff_id = assigned_staff_id;
    if (assigned_staff_name !== undefined) patch.assigned_staff_name = assigned_staff_name;
    if (inspection_status !== undefined) patch.inspection_status = inspection_status;
    if (status === 'in_progress') patch.started_at = new Date().toISOString();
    if (status === 'completed') {
      patch.completed_at = new Date().toISOString();
      if (principal.actorType === 'employee') {
        patch.completed_by = principal.employeeId;
      } else if (principal.userId) {
        patch.completed_by = principal.userId;
      }
      if (!inspection_status) patch.inspection_status = 'pending';
    }
    if (inspection_status === 'approved' || inspection_status === 'rejected') {
      if (task.status !== 'completed' && status !== 'completed') {
        patch.status = 'completed';
        patch.completed_at = patch.completed_at || new Date().toISOString();
      }
    }

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${encodeURIComponent(taskId)}&business_id=eq.${encodeURIComponent(businessId)}`,
      { method: 'PATCH', headers: restHeaders, body: JSON.stringify(patch) },
    );
    if (!updateRes.ok) {
      console.error('housekeeping task update failed:', updateRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update housekeeping task' }) };
    }
    const updated = await updateRes.json();
    const next = updated[0] || { ...task, ...patch };

    let roomPatch = null;
    if (status === 'in_progress') roomPatch = { housekeeping_status: 'cleaning_in_progress' };
    else if (status === 'skipped') roomPatch = { housekeeping_status: 'ready' };
    else if (status === 'completed' && !inspection_status) roomPatch = { housekeeping_status: 'awaiting_inspection' };
    else if (inspection_status === 'rejected') roomPatch = { housekeeping_status: 'cleaning_in_progress' };
    else if (inspection_status === 'approved') {
      roomPatch = { housekeeping_status: 'ready' };
      if (task.is_checkout) roomPatch.occupancy_status = 'vacant';
    } else if (status === 'pending' && task.is_checkout) {
      roomPatch = { occupancy_status: 'departure_pending', housekeeping_status: 'not_ready' };
    }

    if (roomPatch && task.room_id) {
      roomPatch.updated_at = new Date().toISOString();
      await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(task.room_id)}&business_id=eq.${encodeURIComponent(businessId)}`, {
        method: 'PATCH',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(roomPatch),
      }).catch((e) => console.warn('room patch failed', e.message));
    }

    try {
      await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId, room_id: task.room_id,
          event_type: inspection_status ? `housekeeping_inspection_${inspection_status}` : `housekeeping_task_${status || 'updated'}`,
          source: 'staff', severity: 'info', booking_id: task.booking_id, guest_name: task.guest_name,
          details: { task_id: taskId, task_type: task.task_type, is_checkout: task.is_checkout, status: next.status, inspection_status: next.inspection_status, room_patch: roomPatch },
        }),
      });
    } catch (e) { console.warn('room_events', e.message); }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, task: next, room_patch: roomPatch }) };
  } catch (error) {
    console.error('update-housekeeping-task fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update housekeeping task' }) };
  }
};
