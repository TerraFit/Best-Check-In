// Record guest collection for a Lost & Found item.
import auth from './_auth.cjs';
const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function audit(u, k, e) {
  try {
    await fetch(`${u}/rest/v1/audit_logs`, { method: 'POST', headers: { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify([e]) });
  } catch (e) { console.warn('audit failed', e.message); }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  const a = requireBusinessActor(event);
  if (!a.ok) return authFailure(a, headers);
  if (!requireBusinessPermission(a.principal, 'canEditLostFound')) return authFailure({ status: 403, error: 'Missing permission: canEditLostFound' }, headers);
  try {
    let b;
    try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Malformed JSON' }) }; }
    const t = resolveTenant(a.principal, b.businessId || b.business_id);
    if (!t.ok) return authFailure(t, headers);
    const itemId = b.itemId || b.item_id;
    const collectedByName = (b.collected_by_name || b.collectedByName || '').trim();
    if (!itemId || !collectedByName) return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId, itemId, and collected_by_name are required' }) };
    const u = process.env.SUPABASE_URL, k = process.env.SUPABASE_SERVICE_KEY;
    if (!u || !k) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    const now = new Date().toISOString();
    const sh = { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const base = `${u}/rest/v1/lost_and_found?id=eq.${encodeURIComponent(itemId)}&business_id=eq.${encodeURIComponent(t.businessId)}`;
    const actorId = a.principal.employeeId || a.principal.userId || null, actorName = a.principal.email || null;
    const updates = {
      status: 'collected', returned_at: now, returned_to: collectedByName, collected_by_name: collectedByName,
      collected_by_id_number: b.collected_by_id_number || b.collectedByIdNumber || null,
      collection_signature_url: b.collection_signature_url || b.signatureUrl || null,
      released_by_staff_id: actorId, released_by_staff_name: actorName,
      updated_at: now,
    };
    const pr = await fetch(`${base}&status=neq.collected&status=neq.archived`, { method: 'PATCH', headers: sh, body: JSON.stringify(updates) });
    if (!pr.ok) return { statusCode: pr.status === 404 ? 409 : 500, headers, body: JSON.stringify({ error: 'Failed to record Lost & Found collection' }) };
    const item = (await pr.json())[0];
    if (!item) return { statusCode: 409, headers, body: JSON.stringify({ error: 'Item was already collected or archived' }) };
    const when = new Date(now);
    const dateStr = when.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = when.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const notes = `Returned to guest\nCollected by: ${collectedByName}\n` + (updates.collected_by_id_number ? `ID: ${updates.collected_by_id_number}\n` : '') + `Released by: ${actorName || 'Staff'}\n${dateStr}\n${timeStr}`;
    await fetch(`${u}/rest/v1/lost_and_found_activity`, { method: 'POST', headers: sh, body: JSON.stringify([{ business_id: t.businessId, item_id: itemId, event_type: 'collected', employee_id: actorId, employee_name: actorName, from_status: null, to_status: 'collected', notes, details: { collected_by_name: collectedByName, collected_by_id_number: updates.collected_by_id_number, has_signature: !!updates.collection_signature_url } }]) });
    await audit(u, k, {
      business_id: t.businessId, user_id: actorId || '00000000-0000-0000-0000-000000000000',
      user_name: actorName || 'System', user_role: a.principal.role, action: 'lost_found_collected',
      description: `Lost & Found ${item.tag_number || itemId} collected by ${collectedByName}`,
      details: { item_id: itemId, collected_by_name: collectedByName, released_by: actorName },
      guest_name: collectedByName, booking_id: item.booking_id || null, created_at: now,
    });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, item }) };
  } catch (error) {
    console.error('collect-lost-found-item fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Collection failed' }) };
  }
};
