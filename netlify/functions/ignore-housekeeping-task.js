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

    if (task.status !== 'pending') {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Only pending housekeeping tasks can be ignored' }) };
    }

    const activeRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?business_id=eq.${encodeURIComponent(businessId)}&housekeeping_task_id=eq.${encodeURIComponent(task.id)}&status=eq.active&select=id`,
      { headers: restHeaders },
    );
    if (!activeRes.ok) {
      const e = upstream(activeRes.status, 'active session lookup');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    if ((await activeRes.json()).length) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'This housekeeping task has an active service session and cannot be ignored', code: 'ACTIVE_SERVICE_SESSION' }) };
    }

    const now = new Date().toISOString();
    const auditReason = normalizedReason === 'Other'
      ? `Other: ${normalizedDetails}`
      : normalizedDetails ? `${normalizedReason}: ${normalizedDetails}` : normalizedReason;
    const previousNotes = typeof task.notes === 'string' && task.notes.trim() ? task.notes.trim() : '';
    const nextNotes = previousNotes ? `${previousNotes}\nIgnored: ${auditReason}` : `Ignored: ${auditReason}`;

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${encodeURIComponent(task.id)}&business_id=eq.${encodeURIComponent(businessId)}&status=eq.pending`,
      {
        method: 'PATCH',
        headers: writeHeaders,
        body: JSON.stringify({ status: 'skipped', notes: nextNotes, updated_at: now }),
      },
    );
    if (!updateRes.ok) {
      console.error('ignore-housekeeping-task task update failed:', updateRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to ignore housekeeping task' }) };
    }
    const updatedRows = await updateRes.json();
    if (!updatedRows.length) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'This housekeeping task was already changed; refresh the task list and try again', code: 'TASK_CHANGED' }) };
    }

    try {
      await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: writeHeaders,
        body: JSON.stringify({
          business_id: businessId,
          room_id: task.room_id,
          event_type: 'housekeeping_task_ignored',
          source: 'staff',
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
            status: 'skipped',
          },
        }),
      });
    } catch (error) {
      console.warn('room_events ignore audit failed:', error?.message || error);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, task: updatedRows[0], reason: normalizedReason, details: normalizedDetails || null }),
    };
  } catch (error) {
    console.error('ignore-housekeeping-task fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to ignore housekeeping task' }) };
  }
};
