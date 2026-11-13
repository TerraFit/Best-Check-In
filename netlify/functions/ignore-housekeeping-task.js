// netlify/functions/ignore-housekeeping-task.js
// Authoritative endpoint for deliberately removing a pending housekeeping task from
// the operational cleaning queue when the service is no longer required.
// Unlike the audited "skip oldest overdue Refresh" workflow, Ignore is available
// for any eligible pending task (including a newly generated task for an already
// occupied room that was cleaned outside the app).

import auth from './_auth.cjs';
import * as rbac from './_rbac.js';

const { requireBusinessActor, resolveTenant, authFailure } = auth;
const { resolvePermissions } = rbac;

const IGNORE_REASONS = new Set([
  'Room was cleaned but not recorded',
  'Already cleaned',
  'Maintenance',
  'Client did not want the room cleaned',
  'Room was unavailable',
  'Service was no longer required',
]);

function hasPermission(principal, permission) {
  if (!principal) return false;
  if (principal.actorType === 'business' || principal.actorType === 'super_admin') return true;
  return resolvePermissions({
    actorType: principal.actorType,
    role: principal.role,
    permission_set: principal.permissions,
    permissions: principal.permissions,
    active: principal.active,
  }).has(permission);
}

function upstream(status, context) {
  console.error(`ignore-housekeeping-task ${context} upstream failure:`, { status });
  return { statusCode: 502, error: 'Failed to validate housekeeping task' };
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { businessId: requestedBusinessId, taskId, reason, details, adminOverride = false } = body;
    if (!taskId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'taskId required' }) };
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'An ignore reason is required' }) };
    }
    const normalizedReason = reason.trim();
    if (normalizedReason !== 'Other' && !IGNORE_REASONS.has(normalizedReason)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unsupported ignore reason' }) };
    }
    const normalizedDetails = typeof details === 'string' ? details.trim() : '';
    if (adminOverride !== true && ['Already cleaned', 'Maintenance'].includes(normalizedReason)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'This room-state action is reserved for administrators' }) };
    }
    if (normalizedReason === 'Other' && !normalizedDetails) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Details are required when the reason is Other' }) };
    }
    if (normalizedDetails.length > 500) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ignore details must be 500 characters or fewer' }) };
    }

    const authResult = requireBusinessActor(event);
    if (!authResult.ok) return authFailure(authResult, headers);
    const principal = authResult.principal;
    const scope = resolveTenant(principal, requestedBusinessId || null);
    if (!scope.ok) return { statusCode: scope.status, headers, body: JSON.stringify({ error: scope.error }) };
    // Employee-portal Ignore remains permission-based. The administrator-only
    // room-state override is separately asserted server-side and cannot be
    // obtained by merely having the staff task-completion permission.
    if (adminOverride === true) {
      if (!(principal.actorType === 'business' || resolvePermissions({
        actorType: principal.actorType,
        role: principal.role,
        permission_set: principal.permissions,
        permissions: principal.permissions,
        active: principal.active,
      }).has('canManageSettings'))) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Administrator permission required for this room-state override' }) };
      }
    } else if (!hasPermission(principal, 'canCompleteHousekeepingTask')) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Missing permission: canCompleteHousekeepingTask' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    const restHeaders = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const writeHeaders = { ...restHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const businessId = scope.businessId;

    const taskRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${encodeURIComponent(taskId)}&business_id=eq.${encodeURIComponent(businessId)}&select=*`,
      { headers: restHeaders },
    );
    if (!taskRes.ok) {
      const e = upstream(taskRes.status, 'task lookup');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    const task = (await taskRes.json())[0];
    if (!task) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Task not found' }) };

    if (!['pending', 'in_progress'].includes(task.status)) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Only pending or active housekeeping tasks can be skipped' }) };
    }

    // Validate the linked room before changing task/session state. Maintenance
    // must never take an occupied or reserved room offline. Checkout housekeeping
    // marks cleanliness only; it must not rewrite guest occupancy.
    const roomRes = await fetch(
      `${supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(task.room_id)}&business_id=eq.${encodeURIComponent(businessId)}&select=id,occupancy_status,availability_status,active,housekeeping_status`,
      { headers: restHeaders },
    );
    if (!roomRes.ok) {
      const e = upstream(roomRes.status, 'room lookup');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    const room = (await roomRes.json())[0];
    if (!room) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Room not found for this housekeeping task' }) };
    if (normalizedReason === 'Maintenance' && String(room.occupancy_status || '').toLowerCase() !== 'vacant') {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'This room is occupied or reserved and cannot be marked unavailable for maintenance.', code: 'ROOM_NOT_VACANT' }) };
    }

    if (adminOverride) {
      const intentRes = await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: writeHeaders,
        body: JSON.stringify({
          business_id: businessId,
          room_id: task.room_id,
          event_type: 'housekeeping_admin_skip_requested',
          source: 'business_admin',
          severity: 'info',
          booking_id: task.booking_id,
          guest_name: task.guest_name,
          details: {
            task_id: task.id,
            task_type: task.task_type,
            reason: normalizedReason,
            details: normalizedDetails || null,
            previous_status: task.status,
            intended_status: normalizedReason === 'Already cleaned' ? 'completed' : 'skipped',
            outcome: 'requested',
            performed_by: principal.employeeId || principal.userId || null,
            performed_by_type: principal.actorType || null,
          },
        }),
      });
      if (!intentRes.ok) {
        console.error('ignore-housekeeping-task admin audit intent failed:', intentRes.status);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'The administrator action was not applied because its audit record could not be saved.', code: 'AUDIT_WRITE_FAILED', state_updated: false }) };
      }
    }

    const activeRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?business_id=eq.${encodeURIComponent(businessId)}&housekeeping_task_id=eq.${encodeURIComponent(task.id)}&status=eq.active&select=id`,
      { headers: restHeaders },
    );
    if (!activeRes.ok) {
      const e = upstream(activeRes.status, 'active session lookup');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    const activeSessions = await activeRes.json();
    if (activeSessions.length && task.status !== 'in_progress') {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'An active service session exists for a task not marked in progress. Refresh and investigate before skipping.', code: 'TASK_SESSION_MISMATCH' }) };
    }
    const now = new Date().toISOString();
    // Preserve an active execution record when an administrator skips an in-progress task.
    for (const session of activeSessions) {
      const cancelRes = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${encodeURIComponent(session.id)}&business_id=eq.${encodeURIComponent(businessId)}&status=eq.active`,
        { method: 'PATCH', headers: writeHeaders, body: JSON.stringify({
          status: 'cancelled', completed_at: now, cancelled_at: now,
          cancelled_by: principal.employeeId || principal.userId || null,
          cancellation_reason: `Administrator skip: ${normalizedReason}`, updated_at: now,
        }) },
      );
      if (!cancelRes.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to close the active service session safely' }) };
    }
    // When staff confirm that the room was cleaned outside FastCheckIn, older
    // pending tasks for the same room are obsolete. Close only tasks due on or
    // before this task's scheduled date; future guest services remain untouched.
    // These records are retained as skipped for audit/history, never deleted.
    let clearedPreviousTasks = [];
    if (normalizedReason === 'Room was cleaned but not recorded') {
      const previousTasksRes = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&room_id=eq.${encodeURIComponent(task.room_id)}&status=eq.pending&scheduled_date=lte.${encodeURIComponent(task.scheduled_date)}&id=neq.${encodeURIComponent(task.id)}&select=id,booking_id,guest_name,scheduled_date,status&order=scheduled_date.asc,created_at.asc,id.asc`,
        { headers: restHeaders },
      );
      if (!previousTasksRes.ok) {
        const e = upstream(previousTasksRes.status, 'previous pending room tasks lookup');
        return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
      }
      clearedPreviousTasks = await previousTasksRes.json();
      if (clearedPreviousTasks.length) {
        const previousIds = clearedPreviousTasks.map((item) => encodeURIComponent(item.id)).join(',');
        const clearRes = await fetch(
          `${supabaseUrl}/rest/v1/housekeeping_tasks?id=in.(${previousIds})&business_id=eq.${encodeURIComponent(businessId)}&status=eq.pending`,
          {
            method: 'PATCH',
            headers: writeHeaders,
            body: JSON.stringify({
              status: 'skipped',
              updated_at: new Date().toISOString(),
            }),
          },
        );
        if (!clearRes.ok) {
          console.error('ignore-housekeeping-task previous pending task cleanup failed:', clearRes.status);
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to clear previous pending cleaning tasks safely' }) };
        }
        const clearedRows = await clearRes.json();
        if (!Array.isArray(clearedRows) || clearedRows.length !== clearedPreviousTasks.length) {
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'One or more previous housekeeping tasks changed while this action was being saved. Refresh the task list and review the room.', code: 'PREVIOUS_TASKS_CHANGED' }) };
        }
        const previousAuditRes = await fetch(`${supabaseUrl}/rest/v1/room_events`, {
          method: 'POST',
          headers: writeHeaders,
          body: JSON.stringify({
            business_id: businessId,
            room_id: task.room_id,
            event_type: 'housekeeping_previous_pending_tasks_cleared',
            source: principal.actorType || 'staff',
            severity: 'info',
            booking_id: task.booking_id,
            guest_name: task.guest_name,
            details: {
              current_task_id: task.id,
              reason: normalizedReason,
              cleared_tasks: clearedPreviousTasks.map((item) => ({
                task_id: item.id,
                booking_id: item.booking_id,
                guest_name: item.guest_name,
                scheduled_date: item.scheduled_date,
                previous_status: item.status,
                new_status: 'skipped',
              })),
              performed_by: principal.employeeId || principal.userId || null,
              performed_by_type: principal.actorType || null,
              performed_by_name: principal.name || principal.email || null,
            },
          }),
        });
        if (!previousAuditRes.ok) {
          console.error('ignore-housekeeping-task previous task audit failed:', previousAuditRes.status);
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'Previous pending tasks were cleared, but the audit event could not be saved. Please report this to an administrator.', code: 'AUDIT_WRITE_FAILED', state_updated: true }) };
        }
      }
    }

    const auditReason = normalizedReason === 'Other'
      ? `Other: ${normalizedDetails}`
      : normalizedDetails ? `${normalizedReason}: ${normalizedDetails}` : normalizedReason;
    const previousNotes = typeof task.notes === 'string' && task.notes.trim() ? task.notes.trim() : '';
    const auditLabel = normalizedReason === 'Already cleaned' ? 'Marked already cleaned' : normalizedReason === 'Maintenance' ? 'Marked maintenance' : 'Skipped';
    const nextNotes = previousNotes ? `${previousNotes}\n${auditLabel}: ${auditReason}` : `${auditLabel}: ${auditReason}`;

    const alreadyCleaned = normalizedReason === 'Already cleaned';
    const nextStatus = alreadyCleaned ? 'completed' : 'skipped';
    const taskPatch = alreadyCleaned
      ? { status: 'completed', completed_at: now, completed_by: principal.employeeId || principal.userId || null, inspection_status: 'approved', notes: nextNotes, updated_at: now }
      : { status: 'skipped', notes: nextNotes, updated_at: now };
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${encodeURIComponent(task.id)}&business_id=eq.${encodeURIComponent(businessId)}&status=in.(pending,in_progress)`,
      { method: 'PATCH', headers: writeHeaders, body: JSON.stringify(taskPatch) },
    );
    if (!updateRes.ok) {
      console.error('ignore-housekeeping-task task update failed:', updateRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to ignore housekeeping task' }) };
    }
    const updatedRows = await updateRes.json();
    if (!updatedRows.length) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'This housekeeping task was already changed; refresh the task list and try again', code: 'TASK_CHANGED' }) };
    }

    const roomPatch = alreadyCleaned
      ? { housekeeping_status: 'ready' }
      : normalizedReason === 'Maintenance'
        ? { availability_status: 'maintenance', housekeeping_status: 'not_ready', unavailable_reason: 'Maintenance' }
        : null;
    if (roomPatch) {
      const roomUpdate = await fetch(
        `${supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(task.room_id)}&business_id=eq.${encodeURIComponent(businessId)}${normalizedReason === 'Maintenance' ? '&occupancy_status=eq.vacant' : ''}`,
        { method: 'PATCH', headers: writeHeaders, body: JSON.stringify({ ...roomPatch, updated_at: now }) },
      );
      if (!roomUpdate.ok) {
        console.error('ignore-housekeeping-task room update failed:', roomUpdate.status);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Task was updated but the room status could not be synchronized. Refresh the Rooms tab and contact support if it remains inconsistent.', code: 'ROOM_SYNC_FAILED', task_updated: true }) };
      }
      const roomRows = await roomUpdate.json().catch(() => []);
      if (!Array.isArray(roomRows) || roomRows.length !== 1) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'Room state changed while this action was being saved. The task was updated; refresh both tabs and review the room.', code: 'ROOM_STATE_CHANGED', task_updated: true }) };
      }
    }

    try {
      const auditRes = await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: writeHeaders,
        body: JSON.stringify({
          business_id: businessId,
          room_id: task.room_id,
          event_type: alreadyCleaned ? 'housekeeping_marked_already_cleaned' : normalizedReason === 'Maintenance' ? 'room_marked_maintenance' : 'housekeeping_task_ignored',
          source: principal.actorType || 'staff',
          severity: 'info',
          booking_id: task.booking_id,
          guest_name: task.guest_name,
          details: {
            task_id: task.id,
            task_type: task.task_type,
            scheduled_date: task.scheduled_date,
            reason: normalizedReason,
            details: normalizedDetails || null,
            audit_reason: auditReason,
            previous_status: task.status,
            status: nextStatus,
            room_patch: roomPatch,
            cleared_previous_pending_tasks: clearedPreviousTasks.map((item) => ({
              task_id: item.id,
              booking_id: item.booking_id,
              guest_name: item.guest_name,
              scheduled_date: item.scheduled_date,
              previous_status: item.status,
            })),
            performed_by: principal.employeeId || principal.userId || null,
            performed_by_type: principal.actorType || null,
            performed_by_name: principal.name || principal.email || null,
          },
        }),
      });
      if (!auditRes.ok) {
        console.error('room_events ignore audit failed:', auditRes.status);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'The housekeeping action was applied, but its audit event could not be saved. Please report this to an administrator.', code: 'AUDIT_WRITE_FAILED', state_updated: true }) };
      }
    } catch (error) {
      console.error('room_events ignore audit failed:', error?.message || error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'The housekeeping action was applied, but its audit event could not be saved. Please report this to an administrator.', code: 'AUDIT_WRITE_FAILED', state_updated: true }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, task: updatedRows[0], reason: normalizedReason, details: normalizedDetails || null, room_patch: roomPatch, status: nextStatus, cleared_previous_pending_tasks: clearedPreviousTasks.length }),
    };
  } catch (error) {
    console.error('ignore-housekeeping-task fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to ignore housekeeping task' }) };
  }
};
