// Record Lost & Found guest communication; optional Resend email.
import auth from './_auth.cjs';
const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const CONTACT_METHODS = new Set(['email', 'sms', 'whatsapp', 'phone', 'in_person', 'other']);
const CONTACTABLE_STATUSES = new Set(['newly_found', 'awaiting_contact', 'guest_contacted', 'guest_replied', 'collection_arranged']);
async function audit(u, k, e) { try { await fetch(`${u}/rest/v1/audit_logs`, { method: 'POST', headers: { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify([e]) }); } catch (e) { console.warn('audit failed', e.message); } }
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  const a = requireBusinessActor(event);
  if (!a.ok) return authFailure(a, headers);
  if (!requireBusinessPermission(a.principal, 'canEditLostFound')) return authFailure({ status: 403, error: 'Missing permission: canEditLostFound' }, headers);
  try {
    let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Malformed JSON' }) }; }
    const t = resolveTenant(a.principal, b.businessId || b.business_id); if (!t.ok) return authFailure(t, headers);
    const itemId = b.itemId || b.item_id; if (!itemId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId and itemId required' }) };
    const method = b.method || 'email';
    if (!CONTACT_METHODS.has(method)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid contact method' }) };
    const u = process.env.SUPABASE_URL, k = process.env.SUPABASE_SERVICE_KEY;
    if (!u || !k) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    const sh = { apikey: k, Authorization: `Bearer ${k}`, Accept: 'application/json', 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const r = await fetch(`${u}/rest/v1/lost_and_found?id=eq.${encodeURIComponent(itemId)}&business_id=eq.${encodeURIComponent(t.businessId)}&select=*`, { headers: sh });
    if (!r.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to load Lost & Found item' }) };
    const rows = await r.json(); if (!rows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Item not found' }) };
    const item = rows[0];
    if (!CONTACTABLE_STATUSES.has(item.status)) return { statusCode: 409, headers, body: JSON.stringify({ error: 'Guest contact is not allowed for this Lost & Found status' }) };

    let emailSent = false;
    if (method === 'email' && item.guest_email && process.env.RESEND_API_KEY) {
      try {
        const er = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM || 'FastCheckIn <noreply@fastcheckin.co.za>', to: [item.guest_email], subject: b.subject || `Lost & Found — ${item.tag_number || item.item_name}`, text: b.message || `Dear ${item.guest_name || 'Guest'},\n\nWe found an item that may belong to you during your recent stay.\n\nTag: ${item.tag_number || 'N/A'}\nItem: ${item.item_name || 'Item'}\n${item.description ? `Description: ${item.description}\n` : ''}\nPlease contact us to arrange collection.\n\nKind regards` }) });
        emailSent = er.ok;
      } catch (e) { console.warn('email send failed', e.message); }
    }

    const newStatus = 'guest_contacted', now = new Date().toISOString(), actorId = a.principal.employeeId || a.principal.userId || null, actorName = a.principal.email || null;
    const pr = await fetch(`${u}/rest/v1/lost_and_found?id=eq.${encodeURIComponent(itemId)}&business_id=eq.${encodeURIComponent(t.businessId)}&status=eq.${encodeURIComponent(item.status)}&updated_at=eq.${encodeURIComponent(item.updated_at)}`, { method: 'PATCH', headers: sh, body: JSON.stringify({ status: newStatus, updated_at: now }) });
    if (!pr.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update Lost & Found item' }) };
    const updatedRows = await pr.json();
    if (!updatedRows.length) return { statusCode: 409, headers, body: JSON.stringify({ error: 'Lost & Found item changed before contact could be recorded' }) };
    const updated = updatedRows[0];

    const actRes = await fetch(`${u}/rest/v1/lost_and_found_activity`, { method: 'POST', headers: sh, body: JSON.stringify([{ business_id: t.businessId, item_id: itemId, event_type: 'guest_contacted', employee_id: actorId, employee_name: actorName, communication_method: method, outcome: b.outcome || (emailSent ? 'email_sent' : 'recorded'), from_status: item.status, to_status: newStatus, notes: b.notes || null, details: { email_sent: emailSent, method } }]) });
    const activity = actRes.ok ? (await actRes.json())[0] : null;
    await audit(u, k, { business_id: t.businessId, user_id: actorId || '00000000-0000-0000-0000-000000000000', user_name: actorName || 'System', user_role: a.principal.role, action: 'lost_found_guest_contacted', description: `Guest contacted via ${method} for ${item.tag_number || itemId}`, details: { item_id: itemId, method, email_sent: emailSent }, booking_id: item.booking_id || null, guest_name: item.guest_name || null, created_at: now });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, item: updated, activity, email_sent: emailSent, sms_available: false, whatsapp_available: false }) };
  } catch (error) { console.error('contact-lost-found-guest fatal:', error); return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to record guest contact' }) }; }
};
