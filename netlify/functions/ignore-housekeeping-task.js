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

    const { businessId: requestedBusinessId, taskId, reason, details } = body;
    if (!taskId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'taskId required' }) };
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'An ignore reason is required' }) };
    }
    const normalizedReason = reason.trim();
    if (normalizedReason !== 'Other' && !IGNORE_REASONS.has(normalizedReason)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unsupported ignore reason' }) };
    }
    const normalizedDetails = typeof details === 'string' ? details.trim() : '';
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
    if (!hasPermission(principal, 'canCompleteHousekeepingTask')) {
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
    const auditReason = normalizedReason === 'Other'
      ? `Other: ${normalizedDetails}`
      : normalizedDetails ? `${normalizedReason}: ${normalizedDetails}` : normalizedReason;
    const previousNotes = typeof task.notes === 'string' && task.notes.trim() ? task.notes.trim() : '';
    const auditLabel = normalizedReason === 'Already cleaned' || normalizedReason === 'Room was cleaned but not recorded' ? 'Marked already cleaned' : normalizedReason === 'Maintenance' ? 'Marked maintenance' : 'Skipped';
    const nextNotes = previousNotes ? `${previousNotes}\n${auditLabel}: ${auditReason}` : `${auditLabel}: ${auditReason}`;

    const alreadyCleaned = normalizedReason === 'Already cleaned' || normalizedReason === 'Room was cleaned but not recorded';
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
      ? { housekeeping_status: 'ready', ...(task.is_checkout ? { occupancy_status: 'vacant' } : {}) }
      : normalizedReason === 'Maintenance'
        ? { availability_status: 'maintenance', housekeeping_status: 'not_ready', unavailable_reason: 'Maintenance' }
        : null;
    if (roomPatch) {
      const roomUpdate = await fetch(
        `${supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(task.room_id)}&business_id=eq.${encodeURIComponent(businessId)}`,
        { method: 'PATCH', headers: writeHeaders, body: JSON.stringify({ ...roomPatch, updated_at: now }) },
      );
      if (!roomUpdate.ok) {
        console.error('ignore-housekeeping-task room update failed:', roomUpdate.status);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Task was updated but the room status could not be synchronized. Refresh the Rooms tab and contact support if it remains inconsistent.' }) };
      }
    }

    try {
      await fetch(`${supabaseUrl}/rest/v1/room_events`, {
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
            performed_by: principal.employeeId || principal.userId || null,
            performed_by_type: principal.actorType || null,
            performed_by_name: principal.name || principal.email || null,
          },
        }),
      });
    } catch (error) {
      console.warn('room_events ignore audit failed:', error?.message || error);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, task: updatedRows[0], reason: normalizedReason, details: normalizedDetails || null, room_patch: roomPatch, status: nextStatus }),
    };
  } catch (error) {
    console.error('ignore-housekeeping-task fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to ignore housekeeping task' }) };
  }
};
