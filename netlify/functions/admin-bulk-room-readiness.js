// netlify/functions/admin-bulk-room-readiness.js
// Owner/business-dashboard administrative shortcut. Does not mutate housekeeping tasks or sessions.
import auth from './_auth.cjs';
import * as rbac from './_rbac.js';

const { requireBusinessActor, resolveTenant, authFailure } = auth;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasAdministratorPermission(principal) {
  if (principal?.actorType === 'business') return true;
  return rbac.resolvePermissions({
    actorType: principal?.actorType,
    role: principal?.role,
    permission_set: principal?.permissions,
    permissions: principal?.permissions,
    active: principal?.active,
  }).has('canManageSettings');
}

function response(statusCode, headers, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function checkActiveHousekeepingWork(supabaseUrl, businessId, roomId, readHeaders) {
  const taskUrl = `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&room_id=eq.${encodeURIComponent(roomId)}&status=eq.in_progress&select=id,status`;
  const sessionUrl = `${supabaseUrl}/rest/v1/housekeeping_service_sessions?business_id=eq.${encodeURIComponent(businessId)}&room_id=eq.${encodeURIComponent(roomId)}&status=eq.active&select=id,status`;
  try {
    const [taskResponse, sessionResponse] = await Promise.all([
      fetch(taskUrl, { headers: readHeaders }),
      fetch(sessionUrl, { headers: readHeaders }),
    ]);
    if (!taskResponse.ok || !sessionResponse.ok) return { ok: false };
    const [tasks, sessions] = await Promise.all([taskResponse.json(), sessionResponse.json()]);
    if (!Array.isArray(tasks) || !Array.isArray(sessions)) return { ok: false };
    return { ok: true, active: tasks.length > 0 || sessions.length > 0 };
  } catch {
    return { ok: false };
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
  if (event.httpMethod !== 'POST') return response(405, headers, { error: 'Method Not Allowed' });

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers);
  if (!hasAdministratorPermission(actor.principal)) {
    return authFailure({ status: 403, error: 'Administrator permission required for bulk housekeeping room-readiness actions' }, headers);
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return response(400, headers, { error: 'Request body must be valid JSON.' });
    }
    const { businessId: requestedBusinessId, roomIds, action } = body;
    if (!requestedBusinessId || !Array.isArray(roomIds) || !roomIds.length || roomIds.length > 100 ||
        !roomIds.every((id) => typeof id === 'string' && UUID.test(id)) ||
        !['approved', 'skipped'].includes(action)) {
      return response(400, headers, { error: 'Provide a businessId, 1–100 room IDs, and action approved or skipped.' });
    }
    const uniqueIds = [...new Set(roomIds)];
    const tenant = resolveTenant(actor.principal, requestedBusinessId);
    if (!tenant.ok) return authFailure(tenant, headers);
    const businessId = tenant.businessId;
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return response(500, headers, { error: 'Server configuration error' });

    const readHeaders = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const writeHeaders = { ...readHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const inFilter = uniqueIds.join(',');
    const roomUrl = `${supabaseUrl}/rest/v1/rooms?id=in.(${inFilter})&business_id=eq.${encodeURIComponent(businessId)}&select=id,room_number,room_name,active,availability_status,occupancy_status,housekeeping_status,updated_at`;
    const roomResponse = await fetch(roomUrl, { headers: readHeaders });
    if (!roomResponse.ok) return response(502, headers, { error: 'Unable to validate selected rooms.' });
    const rooms = await roomResponse.json();
    if (rooms.length !== uniqueIds.length) return response(400, headers, { error: 'One or more selected rooms do not belong to this business or no longer exist.' });

    const updated = [];
    const unchanged = [];
    const actorId = actor.principal.userId || actor.principal.sub || actor.principal.id || null;
    for (const room of rooms) {
      // Never override disabled, maintenance, out-of-order, unavailable, occupied,
      // reserved, or departure-pending rooms. Recheck these constraints in the PATCH
      // filter as a concurrency guard.
      const eligible = room.active === true &&
        room.availability_status === 'available' &&
        room.occupancy_status === 'vacant';
      if (!eligible) {
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'Room is inactive, unavailable, or occupied/reserved.' });
        continue;
      }
      if (!room.updated_at) {
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'Room state cannot be safely version-checked; no change was made.' });
        continue;
      }
      if (room.housekeeping_status === 'cleaning_in_progress') {
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'A housekeeping service is currently in progress.' });
        continue;
      }
      const activeWork = await checkActiveHousekeepingWork(supabaseUrl, businessId, room.id, readHeaders);
      if (!activeWork.ok) {
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'Unable to verify active housekeeping work; no change was made.' });
        continue;
      }
      if (activeWork.active) {
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'An in-progress housekeeping task or active service session must be completed first.' });
        continue;
      }

      const eventType = action === 'approved' ? 'admin_bulk_housekeeping_approved' : 'admin_bulk_housekeeping_skipped';
      const eventPayload = {
        business_id: businessId,
        room_id: room.id,
        event_type: eventType,
        source: 'system',
        severity: 'info',
        performed_by: typeof actorId === 'string' && UUID.test(actorId) ? actorId : null,
        details: { action, outcome: 'requested', actor_type: actor.principal.actorType || 'business', actor_id: actorId, note: 'Room marked ready using owner/admin bulk housekeeping shortcut.' },
      };
      // Persist the audit intent before changing room state. If the audit store
      // is unavailable, do not perform an unlogged administrative mutation.
      const auditResponse = await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: { ...writeHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(eventPayload),
      });
      if (!auditResponse.ok) {
        console.error('admin-bulk-room-readiness audit event failed:', auditResponse.status, room.id);
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'Audit event could not be recorded; no change was made.' });
        continue;
      }
      const auditRows = await auditResponse.json().catch(() => []);
      const auditId = Array.isArray(auditRows) ? auditRows[0]?.id : null;

      // Recheck after writing the audit intent to narrow the race window between
      // eligibility validation and the room-state mutation. Fail closed on lookup errors.
      const finalWorkCheck = await checkActiveHousekeepingWork(supabaseUrl, businessId, room.id, readHeaders);
      if (!finalWorkCheck.ok || finalWorkCheck.active) {
        if (auditId) {
          await fetch(`${supabaseUrl}/rest/v1/room_events?id=eq.${encodeURIComponent(auditId)}&business_id=eq.${encodeURIComponent(businessId)}`, {
            method: 'PATCH',
            headers: writeHeaders,
            body: JSON.stringify({ details: {
              ...eventPayload.details,
              outcome: 'not_applied',
              failure: finalWorkCheck.ok ? 'Housekeeping work became active before room readiness could be changed.' : 'Active housekeeping work could not be rechecked.',
            } }),
          }).catch(() => {});
        }
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: finalWorkCheck.ok ? 'Housekeeping work became active before the room could be marked ready.' : 'Unable to recheck active housekeeping work; no change was made.' });
        continue;
      }

      // Compare-and-set against the exact room version read above. The employee
      // start endpoint claims the same room row first; PostgreSQL serializes the
      // conditional UPDATE so only one transition can win this race.
      const patchUrl = `${supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(room.id)}&business_id=eq.${encodeURIComponent(businessId)}&active=eq.true&availability_status=eq.available&occupancy_status=eq.vacant&updated_at=eq.${encodeURIComponent(room.updated_at)}`;
      const patchResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers: writeHeaders,
        body: JSON.stringify({ housekeeping_status: 'ready', updated_at: new Date().toISOString() }),
      });
      if (!patchResponse.ok) {
        console.error('admin-bulk-room-readiness room update failed:', patchResponse.status);
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'Update failed after audit was recorded.' });
        if (auditId) await fetch(`${supabaseUrl}/rest/v1/room_events?id=eq.${encodeURIComponent(auditId)}&business_id=eq.${encodeURIComponent(businessId)}`, {
          method: 'PATCH', headers: writeHeaders, body: JSON.stringify({ details: { ...eventPayload.details, outcome: 'failed', failure: 'Room update failed.' } }),
        }).catch(() => {});
        continue;
      }
      const rows = await patchResponse.json().catch(() => []);
      if (!Array.isArray(rows) || rows.length !== 1) {
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'Room state changed during the update.' });
        if (auditId) await fetch(`${supabaseUrl}/rest/v1/room_events?id=eq.${encodeURIComponent(auditId)}&business_id=eq.${encodeURIComponent(businessId)}`, {
          method: 'PATCH', headers: writeHeaders, body: JSON.stringify({ details: { ...eventPayload.details, outcome: 'not_applied', failure: 'Room state changed during the update.' } }),
        }).catch(() => {});
        continue;
      }
      updated.push(room);
      if (auditId) {
        const finalAudit = await fetch(`${supabaseUrl}/rest/v1/room_events?id=eq.${encodeURIComponent(auditId)}&business_id=eq.${encodeURIComponent(businessId)}`, {
          method: 'PATCH', headers: writeHeaders, body: JSON.stringify({ details: { ...eventPayload.details, outcome: 'completed' } }),
        });
        if (!finalAudit.ok) {
          console.error('admin-bulk-room-readiness audit finalization failed:', finalAudit.status, room.id);
          return response(500, headers, { success: false, partial: true, updated: updated.length, notChanged: unchanged.length, error: 'Some rooms were updated, but audit finalization failed. Review the Room Events history before retrying.', code: 'AUDIT_FINALIZATION_FAILED' });
        }
      }
    }

    return response(200, headers, {
      success: true,
      action,
      updated: updated.length,
      notChanged: unchanged.length,
      unchanged,
      rooms: updated.map((room) => ({ id: room.id, room_name: room.room_name, room_number: room.room_number })),
    });
  } catch (error) {
    console.error('admin-bulk-room-readiness failed:', error);
    return response(500, headers, { error: 'Failed to update room readiness.' });
  }
};
