// Start a measured housekeeping service session.
// Elapsed time is derived from the persisted server timestamp, not browser ticks.
// Authorization and tenant identity are authoritative on the server.

import auth from './_auth.cjs';
import rbac from './_rbac.cjs';

const { requireBusinessActor, resolveTenant, authFailure } = auth;

const DEFAULT_TARGETS = { refresh: 45, full_service: 60, deep_cleaning: 120, mattress_flip_air: 30, checkout_inspection: 10 };
const MANAGEMENT_ROLES = new Set(['team leader', 'supervisor', 'foreman', 'manager', 'director', 'general manager', 'business owner']);

function hasStartPermission(principal) {
  if (!principal) return false;
  if (principal.actorType === 'business') return true;
  const role = String(principal.role || '').trim().toLowerCase();
  return MANAGEMENT_ROLES.has(role) || rbac.requirePermission(principal, 'canStartHousekeepingTask');
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
  if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(principal.employeeId)}&business_id=eq.${encodeURIComponent(principal.businessId)}&select=id,business_id,status`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
    if (!res.ok) return { statusCode: 503, headers, body: JSON.stringify({ success: false, error: 'Unable to verify employee status' }) };
    const employee = (await res.json())[0];
    if (!employee) return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Employee account not found' }) };
    if (String(employee.status || '').toLowerCase() === 'disabled') return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Account has been disabled. Please contact your administrator.', code: 'EMPLOYEE_DISABLED' }) };
    if (String(employee.business_id) !== String(principal.businessId)) return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Forbidden: business scope mismatch' }) };
    return null;
  } catch (error) {
    console.error('employee status verification failed:', error?.message || error);
    return { statusCode: 503, headers, body: JSON.stringify({ success: false, error: 'Unable to verify employee status' }) };
  }
}

function nextRoomVersion(currentVersion) {
  const previousMs = Date.parse(currentVersion);
  const nowMs = Date.now();
  return new Date(Number.isFinite(previousMs) ? Math.max(nowMs, previousMs + 1) : nowMs).toISOString();
}

async function releaseRoomClaim({ supabaseUrl, write, businessId, roomId, claimedAt, previousStatus }) {
  try {
    const releasedAt = nextRoomVersion(claimedAt);
    const result = await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(roomId)}&business_id=eq.${encodeURIComponent(businessId)}&updated_at=eq.${encodeURIComponent(claimedAt)}`, {
      method: 'PATCH',
      headers: write,
      body: JSON.stringify({ housekeeping_status: previousStatus || 'not_ready', updated_at: releasedAt }),
    });
    if (!result.ok) console.error('housekeeping room claim rollback failed:', result.status, roomId);
    else {
      const rows = await result.json().catch(() => []);
      if (!Array.isArray(rows) || rows.length !== 1) console.warn('housekeeping room claim was not rolled back because the room changed again:', roomId);
    }
  } catch (error) {
    console.error('housekeeping room claim rollback failed:', error?.message || error);
  }
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON body' }) }; }

    const authResult = requireBusinessActor(event);
    if (!authResult.ok) return authFailure(authResult, headers);
    const principal = authResult.principal;
    const employeeStatusFailure = await assertEmployeeActive(principal, headers);
    if (employeeStatusFailure) return employeeStatusFailure;
    if (!hasStartPermission(principal)) return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Missing permission: canStartHousekeepingTask' }) };

    const scope = resolveTenant(principal, body.businessId || null);
    if (!scope.ok) return authFailure(scope, headers);
    const businessId = scope.businessId;
    const { taskId, serviceType } = body;
    if (!taskId || !serviceType) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'taskId and serviceType are required' }) };
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_TARGETS, serviceType)) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Unsupported service type' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const q = (v) => encodeURIComponent(v);

    const taskRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(taskId)}&business_id=eq.${q(businessId)}&select=*`, { headers: read });
    if (!taskRes.ok) { console.error('housekeeping task lookup failed:', taskRes.status); return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to load housekeeping task' }) }; }
    const task = (await taskRes.json())[0];
    if (!task) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Housekeeping task not found' }) };
    if (task.status !== 'pending') {
      let conflictTask = task;
      if (task.status === 'in_progress') {
        const activeSessionRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?business_id=eq.${q(businessId)}&housekeeping_task_id=eq.${q(task.id)}&status=eq.active&select=*&order=started_at.desc&limit=1`, { headers: read });
        if (activeSessionRes.ok) {
          const activeSession = (await activeSessionRes.json())[0];
          if (activeSession) conflictTask = { ...task, active_session: activeSession };
        }
      }
      return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: `Task is already ${task.status}`, task: conflictTask }) };
    }

    const assignedEmployeeId = String(task.assigned_staff_id || '');
    const currentEmployeeId = String(principal.employeeId || '');
    if (!isManagement(principal) && assignedEmployeeId && assignedEmployeeId !== currentEmployeeId) return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Forbidden: housekeeping task is assigned to another employee' }) };

    const roomRes = await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${q(task.room_id)}&business_id=eq.${q(businessId)}&select=id,room_type,room_name,room_number,housekeeping_status,updated_at`, { headers: read });
    if (!roomRes.ok) { console.error('housekeeping room lookup failed:', roomRes.status); return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to load room' }) }; }
    const room = (await roomRes.json())[0];
    if (!room) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Room not found' }) };
    if (!room.updated_at || !Number.isFinite(Date.parse(room.updated_at))) return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Room state cannot be safely claimed. Refresh and try again.', code: 'ROOM_STATE_VERSION_MISSING' }) };
    if (room.housekeeping_status === 'cleaning_in_progress') return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Housekeeping is already in progress for this room.', code: 'ROOM_CLEANING_IN_PROGRESS' }) };

    let settings = null;
    const settingsRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_settings?business_id=eq.${q(businessId)}&select=*&limit=1`, { headers: read });
    if (settingsRes.ok) settings = (await settingsRes.json())[0] || null;
    const targetsRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_targets?business_id=eq.${q(businessId)}&service_type=eq.${q(serviceType)}&active=eq.true&select=*`, { headers: read });
    const targets = targetsRes.ok ? await targetsRes.json() : [];
    const roomType = String(room.room_type || '').trim().toLowerCase();
    const override = targets.find((target) => String(target.room_type || '').trim().toLowerCase() === roomType);
    const serviceDefault = targets.find((target) => !target.room_type);
    const targetMinutes = Number(override?.target_minutes || serviceDefault?.target_minutes || DEFAULT_TARGETS[serviceType]);
    const warningMinutes = Number(settings?.warning_minutes ?? 15);
    const startedAt = new Date().toISOString();

    // Claim the room using an optimistic compare-and-set on its version. The
    // administrator readiness endpoint uses the same version guard, so only
    // one of the competing state transitions can succeed.
    const roomClaimVersion = nextRoomVersion(room.updated_at);
    const claimUrl = `${supabaseUrl}/rest/v1/rooms?id=eq.${q(room.id)}&business_id=eq.${q(businessId)}&updated_at=eq.${q(room.updated_at)}`;
    const claimRes = await fetch(claimUrl, {
      method: 'PATCH',
      headers: write,
      body: JSON.stringify({ housekeeping_status: 'cleaning_in_progress', updated_at: roomClaimVersion }),
    });
    if (!claimRes.ok) {
      console.error('housekeeping room claim failed:', claimRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Unable to reserve the room for housekeeping.' }) };
    }
    const claimedRows = await claimRes.json().catch(() => []);
    if (!Array.isArray(claimedRows) || claimedRows.length !== 1) {
      return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Room state changed while housekeeping was starting. Refresh and try again.', code: 'ROOM_STATE_CHANGED' }) };
    }
    const claimedAt = claimedRows[0].updated_at || roomClaimVersion;

    const sessionRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions`, { method: 'POST', headers: write, body: JSON.stringify({ business_id: businessId, housekeeping_task_id: task.id, room_id: room.id, booking_id: task.booking_id || null, employee_id: principal.employeeId, employee_name: principal.employeeName || task.assigned_staff_name || null, service_type: serviceType, room_type_snapshot: room.room_type || null, target_minutes_snapshot: targetMinutes, warning_minutes_snapshot: warningMinutes, started_at: startedAt, status: 'active', checklist_completed_count: 0, checklist_total_count: 0, issues_reported_count: 0, quality_result: 'pending', checklist_state: {} }) });
    if (!sessionRes.ok) {
      await releaseRoomClaim({ supabaseUrl, write, businessId, roomId: room.id, claimedAt, previousStatus: room.housekeeping_status });
      console.error('housekeeping session creation failed:', sessionRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to start housekeeping service' }) };
    }
    const sessionRows = await sessionRes.json().catch(() => []);
    const session = Array.isArray(sessionRows) ? sessionRows[0] : null;
    if (!session) {
      await releaseRoomClaim({ supabaseUrl, write, businessId, roomId: room.id, claimedAt, previousStatus: room.housekeeping_status });
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to start housekeeping service' }) };
    }

    const taskRes2 = await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(task.id)}&business_id=eq.${q(businessId)}&status=eq.pending`, { method: 'PATCH', headers: write, body: JSON.stringify({ status: 'in_progress', started_at: startedAt, updated_at: startedAt }) });
    const startedTasks = taskRes2.ok ? await taskRes2.json().catch(() => []) : [];
    if (!taskRes2.ok || !Array.isArray(startedTasks) || startedTasks.length !== 1) {
      await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(session.id)}&business_id=eq.${q(businessId)}`, { method: 'PATCH', headers: write, body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() }) }).catch(() => {});
      await releaseRoomClaim({ supabaseUrl, write, businessId, roomId: room.id, claimedAt, previousStatus: room.housekeeping_status });
      if (taskRes2.ok) return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'The housekeeping task changed while the service was starting. Refresh and try again.', code: 'TASK_STATE_CHANGED' }) };
      console.error('housekeeping task start update failed:', taskRes2.status);
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to start housekeeping service' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, session, timer: { startedAt, targetMinutes, warningMinutes, finalCountdownSeconds: Number(settings?.final_countdown_seconds ?? 5), voiceEnabled: settings?.voice_enabled ?? true, soundEnabled: settings?.sound_enabled ?? true } }) };
  } catch (error) {
    console.error('start-housekeeping-service fatal:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to start housekeeping service' }) };
  }
};
