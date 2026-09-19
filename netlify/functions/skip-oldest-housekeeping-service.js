// netlify/functions/skip-oldest-housekeeping-service.js
// Authoritative endpoint for deliberately skipping the oldest overdue Refresh service.
// This is intentionally separate from generic task updates so the server can enforce
// that only the oldest of multiple overdue Refresh tasks for a room may be skipped.

import auth from './_auth.cjs';
import * as rbac from './_rbac.js';

const { requireBusinessActor, resolveTenant, authFailure } = auth;
const { resolvePermissions } = rbac;

const SKIP_REASONS = new Set([
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

function todaySouthAfrica() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function upstream(status, context) {
  console.error(`skip-oldest-housekeeping-service ${context} upstream failure:`, { status });
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
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'A skip reason is required' }) };
    }
    const normalizedReason = reason.trim();
    if (normalizedReason !== 'Other' && !SKIP_REASONS.has(normalizedReason)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unsupported skip reason' }) };
    }
    const normalizedDetails = typeof details === 'string' ? details.trim() : '';
    if (normalizedReason === 'Other' && !normalizedDetails) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Details are required when the reason is Other' }) };
    }
    if (normalizedDetails.length > 500) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Skip details must be 500 characters or fewer' }) };
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
    const today = todaySouthAfrica();

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

    if (task.task_type !== 'refresh' || task.is_checkout) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Only non-checkout Refresh tasks can be skipped' }) };
    }
    if (task.status !== 'pending') {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Only pending overdue Refresh tasks can be skipped' }) };
    }
    if (!task.scheduled_date || task.scheduled_date >= today) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'This Refresh service is not overdue' }) };
    }

    const openRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&room_id=eq.${encodeURIComponent(task.room_id)}&task_type=eq.refresh&is_checkout=eq.false&status=eq.pending&scheduled_date=lt.${encodeURIComponent(today)}&select=id,scheduled_date,created_at,status&order=scheduled_date.asc,created_at.asc,id.asc`,
      { headers: restHeaders },
    );
    if (!openRes.ok) {
      const e = upstream(openRes.status, 'overdue Refresh lookup');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    const overdueTasks = await openRes.json();
    if (overdueTasks.length < 2) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'There is only one overdue Refresh service for this room; it should be performed rather than skipped.' }) };
    }

    const oldest = overdueTasks[0];
    if (oldest.id !== task.id) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Only the oldest overdue Refresh service can be skipped', oldest_task_id: oldest.id }),
      };
    }

    const now = new Date().toISOString();
    const auditReason = normalizedReason === 'Other'
      ? `Other: ${normalizedDetails}`
      : normalizedDetails ? `${normalizedReason}: ${normalizedDetails}` : normalizedReason;
    const previousNotes = typeof task.notes === 'string' && task.notes.trim() ? task.notes.trim() : '';
    const nextNotes = previousNotes ? `${previousNotes}\nSkipped: ${auditReason}` : `Skipped: ${auditReason}`;

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${encodeURIComponent(task.id)}&business_id=eq.${encodeURIComponent(businessId)}&status=eq.pending`,
      {
        method: 'PATCH',
        headers: writeHeaders,
        body: JSON.stringify({ status: 'skipped', notes: nextNotes, updated_at: now }),
      },
    );
    if (!updateRes.ok) {
      console.error('skip-oldest-housekeeping-service task update failed:', updateRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to skip housekeeping task' }) };
    }
    const updatedRows = await updateRes.json();
    const updated = updatedRows[0] || { ...task, status: 'skipped', notes: nextNotes, updated_at: now };

    try {
      await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: writeHeaders,
        body: JSON.stringify({
          business_id: businessId,
          room_id: task.room_id,
          event_type: 'housekeeping_task_skipped',
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
      console.warn('room_events skip audit failed:', error?.message || error);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, task: updated, reason: normalizedReason, details: normalizedDetails || null }),
    };
  } catch (error) {
    console.error('skip-oldest-housekeeping-service fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to skip housekeeping task' }) };
  }
};
