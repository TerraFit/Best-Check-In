// netlify/functions/admin-bulk-room-readiness.js
// Owner/business-dashboard administrative shortcut. Does not mutate housekeeping tasks or sessions.
import auth from './_auth.cjs';

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(statusCode, headers, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
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
  if (!requireBusinessPermission(actor.principal, 'canApproveRoomChanges')) {
    return authFailure({ status: 403, error: 'Missing permission: canApproveRoomChanges' }, headers);
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
    const roomUrl = `${supabaseUrl}/rest/v1/rooms?id=in.(${inFilter})&business_id=eq.${encodeURIComponent(businessId)}&select=id,room_number,room_name,active,availability_status,occupancy_status,housekeeping_status`;
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

      const patchUrl = `${supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(room.id)}&business_id=eq.${encodeURIComponent(businessId)}&active=eq.true&availability_status=eq.available&occupancy_status=eq.vacant`;
      const patchResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers: writeHeaders,
        body: JSON.stringify({ housekeeping_status: 'ready', updated_at: new Date().toISOString() }),
      });
      if (!patchResponse.ok) {
        console.error('admin-bulk-room-readiness room update failed:', patchResponse.status);
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'Update failed.' });
        continue;
      }
      const rows = await patchResponse.json().catch(() => []);
      if (!Array.isArray(rows) || rows.length !== 1) {
        unchanged.push({ id: room.id, room: room.room_name || room.room_number, reason: 'Room state changed during the update.' });
        continue;
      }
      updated.push(room);

      const eventType = action === 'approved' ? 'admin_bulk_housekeeping_approved' : 'admin_bulk_housekeeping_skipped';
      const eventPayload = {
        business_id: businessId,
        room_id: room.id,
        event_type: eventType,
        source: 'system',
        severity: 'info',
        performed_by: typeof actorId === 'string' && UUID.test(actorId) ? actorId : null,
        details: { action, actor_type: actor.principal.actorType || 'business', actor_id: actorId, note: 'Room marked ready using owner/admin bulk housekeeping shortcut.' },
      };
      const auditResponse = await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: { ...writeHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify(eventPayload),
      });
      if (!auditResponse.ok) console.error('admin-bulk-room-readiness audit event failed:', auditResponse.status, room.id);
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
