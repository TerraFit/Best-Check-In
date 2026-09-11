// Update Lost & Found item/status with tenant-bound authorization.
import auth from './_auth.cjs';
const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WORKFLOW_TRANSITIONS = {
  newly_found: new Set(['awaiting_contact']),
  awaiting_contact: new Set(['guest_replied', 'collection_arranged']),
  guest_contacted: new Set(['guest_replied', 'collection_arranged']),
  guest_replied: new Set(['collection_arranged']),
  collection_arranged: new Set(['courier_booked']),
  courier_booked: new Set(['returned']),
  returned: new Set(['archived']),
  collected: new Set(['archived']),
  unclaimed: new Set(['archived']),
  archived: new Set([]),
};

async function audit(supabaseUrl, key, entry) {
  try { await fetch(`${supabaseUrl}/rest/v1/audit_logs`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify([entry]) }); } catch (e) { console.warn('audit failed', e.message); }
}
async function activity(supabaseUrl, key, entry) {
  try { await fetch(`${supabaseUrl}/rest/v1/lost_and_found_activity`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify([entry]) }); } catch (e) { console.warn('activity log failed', e.message); }
}
function photoCount(urls) { return Array.isArray(urls) ? urls.filter(Boolean).length : 0; }
function q(value) { return encodeURIComponent(String(value)); }

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  const a = requireBusinessActor(event);
  if (!a.ok) return authFailure(a, headers);
  if (!requireBusinessPermission(a.principal, 'canEditLostFound')) return authFailure({ status: 403, error: 'Missing permission: canEditLostFound' }, headers);
  try {
    let body; try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Malformed JSON' }) }; }
    const t = resolveTenant(a.principal, body.businessId || body.business_id); if (!t.ok) return authFailure(t, headers);
    const businessId = t.businessId, itemId = body.itemId || body.item_id;
    if (!itemId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId and itemId are required' }) };

    // Authorization for the privileged terminal transition is checked before any
    // object lookup so callers cannot use an archive request to probe item state.
    if (body.status === 'archived' && !requireBusinessPermission(a.principal, 'canDisposeLostFound')) {
      return authFailure({ status: 403, error: 'Missing permission: canDisposeLostFound' }, headers);
    }

    const supabaseUrl = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    const sh = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const base = `${supabaseUrl}/rest/v1/lost_and_found?id=eq.${q(itemId)}&business_id=eq.${q(businessId)}`;
    const curRes = await fetch(`${base}&select=*`, { headers: sh });
    if (!curRes.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to load Lost & Found item' }) };
    const currentRows = await curRes.json(); if (!currentRows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Item not found' }) };
    const current = currentRows[0];
    if (body.status !== undefined && body.status !== current.status) {
      const next = body.status;
      if (next === 'archived' && !requireBusinessPermission(a.principal, 'canDisposeLostFound')) return authFailure({ status: 403, error: 'Missing permission: canDisposeLostFound' }, headers);
      const allowedNext = WORKFLOW_TRANSITIONS[current.status] || new Set();
      if (!allowedNext.has(next)) return { statusCode: 409, headers, body: JSON.stringify({ error: 'Invalid Lost & Found status transition' }) };
    }
    if (body.room_id !== undefined && body.room_id !== null && body.room_id !== '') {
      const roomRes = await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${q(body.room_id)}&business_id=eq.${q(businessId)}&select=id,room_number,name,room_name`, { headers: sh });
      if (!roomRes.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to validate room' }) };
      if (!(await roomRes.json()).length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Room does not belong to this business' }) };
    }
    if (body.booking_id !== undefined && body.booking_id !== null && body.booking_id !== '') {
      const bookingRes = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${q(body.booking_id)}&business_id=eq.${q(businessId)}&select=id,room_id`, { headers: sh });
      if (!bookingRes.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to validate booking' }) };
      const bookings = await bookingRes.json(); if (!bookings.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Booking does not belong to this business' }) };
      if (body.room_id && bookings[0].room_id && String(bookings[0].room_id) !== String(body.room_id)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Booking and room do not match' }) };
    }
    const allowed = ['item_name','description','category','found_date','time_found','room_id','room_number','room_name','booking_id','booking_reference','guest_name','guest_email','guest_phone','storage_location','storage_detail','condition','estimated_value','internal_notes','notes','photo_urls','status','returned_to'];
    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
    if (updates.status === 'returned' || updates.status === 'collected') updates.returned_at = updates.returned_at || new Date().toISOString();
    if (updates.status === 'archived') updates.archived_at = new Date().toISOString();
    const patchRes = await fetch(`${base}&updated_at=eq.${q(current.updated_at)}`, { method: 'PATCH', headers: sh, body: JSON.stringify(updates) });
    if (!patchRes.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update Lost & Found item' }) };
    const updatedRows = await patchRes.json(); if (!updatedRows.length) return { statusCode: 409, headers, body: JSON.stringify({ error: 'Lost & Found item changed before update could be applied' }) };
    const updated = updatedRows[0], empId = a.principal.employeeId || a.principal.userId || null, empName = a.principal.email || null;
    const photosChanged = body.photo_urls !== undefined && JSON.stringify(body.photo_urls || []) !== JSON.stringify(current.photo_urls || []);
    if (body.status && body.status !== current.status) {
      await activity(supabaseUrl, key, { business_id: businessId, item_id: itemId, event_type: body.status === 'archived' ? 'archived' : 'status_change', employee_id: empId, employee_name: empName, from_status: current.status, to_status: body.status, notes: body.note || `Status changed from ${current.status} to ${body.status}` });
      await audit(supabaseUrl, key, { business_id: businessId, user_id: empId || '00000000-0000-0000-0000-000000000000', user_name: empName || 'System', user_role: a.principal.role, action: 'lost_found_status_change', description: `Lost & Found ${current.tag_number || itemId}: ${current.status} → ${body.status}`, details: { item_id: itemId, from: current.status, to: body.status }, booking_id: current.booking_id || null, guest_name: current.guest_name || null, created_at: new Date().toISOString() });
    } else if (photosChanged) {
      const prev = photoCount(current.photo_urls), next = photoCount(body.photo_urls), notes = next > prev ? `${next - prev} photo(s) added (${next} total)` : next < prev ? `Photos updated (${next} remaining, was ${prev})` : `Photos updated (${next} total)`;
      await activity(supabaseUrl, key, { business_id: businessId, item_id: itemId, event_type: 'photos_added', employee_id: empId, employee_name: empName, notes, details: { previous_count: prev, new_count: next } });
      await audit(supabaseUrl, key, { business_id: businessId, user_id: empId || '00000000-0000-0000-0000-000000000000', user_name: empName || 'System', user_role: a.principal.role, action: 'lost_found_photos_updated', description: `Lost & Found ${current.tag_number || itemId}: photos ${prev} → ${next}`, details: { item_id: itemId, previous_count: prev, new_count: next }, booking_id: current.booking_id || null, guest_name: current.guest_name || null, created_at: new Date().toISOString() });
    } else if (body.note) {
      await activity(supabaseUrl, key, { business_id: businessId, item_id: itemId, event_type: 'note_added', employee_id: empId, employee_name: empName, notes: body.note });
    } else {
      await activity(supabaseUrl, key, { business_id: businessId, item_id: itemId, event_type: 'updated', employee_id: empId, employee_name: empName, notes: 'Item details updated', details: { fields: Object.keys(updates).filter((k) => k !== 'updated_at') } });
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, item: updated }) };
  } catch (error) { console.error('update-lost-found-item fatal:', error); return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update Lost & Found item' }) }; }
};
