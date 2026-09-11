// Create Lost & Found item.
import auth from './_auth.cjs';
const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

function restHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function fetchOne(url, key, table, filters) {
  const query = Object.entries(filters).map(([field, value]) => `${encodeURIComponent(field)}=eq.${encodeURIComponent(value)}`).join('&');
  const response = await fetch(`${url}/rest/v1/${table}?${query}&select=*`, { headers: restHeaders(key) });
  if (!response.ok) throw new Error(`Failed to validate ${table} reference`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function nextTag(u, k, b) {
  const y = new Date().getFullYear(), sh = { ...restHeaders(k), Prefer: 'return=representation' };
  const r = await fetch(`${u}/rest/v1/lost_and_found_tag_sequences?business_id=eq.${encodeURIComponent(b)}&select=*`, { headers: sh });
  const rows = r.ok ? await r.json() : [];
  let seq = 1;
  if (rows.length && rows[0].year === y) {
    seq = (rows[0].last_seq || 0) + 1;
    await fetch(`${u}/rest/v1/lost_and_found_tag_sequences?business_id=eq.${encodeURIComponent(b)}`, { method: 'PATCH', headers: sh, body: JSON.stringify({ last_seq: seq, year: y, updated_at: new Date().toISOString() }) });
  } else if (rows.length) {
    await fetch(`${u}/rest/v1/lost_and_found_tag_sequences?business_id=eq.${encodeURIComponent(b)}`, { method: 'PATCH', headers: sh, body: JSON.stringify({ last_seq: 1, year: y, updated_at: new Date().toISOString() }) });
  } else {
    await fetch(`${u}/rest/v1/lost_and_found_tag_sequences`, { method: 'POST', headers: sh, body: JSON.stringify([{ business_id: b, year: y, last_seq: 1 }]) });
  }
  return `LF-${y}-${String(seq).padStart(4, '0')}`;
}

async function audit(u, k, e) {
  try {
    await fetch(`${u}/rest/v1/audit_logs`, { method: 'POST', headers: { ...restHeaders(k), Prefer: 'return=minimal' }, body: JSON.stringify([e]) });
  } catch (e) {
    console.warn('audit log failed', e.message);
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const a = requireBusinessActor(event);
  if (!a.ok) return authFailure(a, headers);
  if (!requireBusinessPermission(a.principal, 'canCreateLostFound')) return authFailure({ status: 403, error: 'Missing permission: canCreateLostFound' }, headers);

  try {
    let b;
    try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Malformed JSON' }) }; }

    const t = resolveTenant(a.principal, b.businessId || b.business_id);
    if (!t.ok) return authFailure(t, headers);
    if (!b.item_name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId and item_name are required' }) };

    const u = process.env.SUPABASE_URL, k = process.env.SUPABASE_SERVICE_KEY;
    if (!u || !k) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    // Resource identifiers are never trusted merely because the caller is authenticated.
    // Bind every supplied booking/room reference to the authoritative tenant before writing it.
    let booking = null;
    let room = null;
    if (b.booking_id) {
      booking = await fetchOne(u, k, 'bookings', { id: b.booking_id, business_id: t.businessId });
      if (!booking) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Booking is outside the authorized business' }) };
    }
    if (b.room_id) {
      room = await fetchOne(u, k, 'rooms', { id: b.room_id, business_id: t.businessId });
      if (!room) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Room is outside the authorized business' }) };
    }

    const photos = Array.isArray(b.photo_urls) ? b.photo_urls.filter(Boolean) : [];
    const tag = await nextTag(u, k, t.businessId);
    const now = new Date().toISOString();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const actorId = a.principal.employeeId || a.principal.userId || null;
    const actorName = a.principal.email || null;

    const authoritativeGuestName = booking?.guest_name || booking?.guestName || null;
    const authoritativeGuestEmail = booking?.guest_email || booking?.guestEmail || null;
    const authoritativeGuestPhone = booking?.guest_phone || booking?.guestPhone || null;
    const authoritativeCheckIn = booking?.check_in_date || booking?.checkInDate || booking?.check_in || null;
    const authoritativeCheckOut = booking?.check_out_date || booking?.checkOutDate || booking?.check_out || null;
    const authoritativeRoomNumber = room?.room_number != null ? String(room.room_number) : (booking?.room_number != null ? String(booking.room_number) : null);
    const authoritativeRoomName = room?.room_name || room?.name || booking?.room_name || booking?.roomName || null;

    const row = {
      business_id: t.businessId,
      tag_number: tag,
      item_name: b.item_name,
      description: b.description || null,
      category: b.category || 'Miscellaneous',
      found_date: b.found_date || today,
      time_found: b.time_found || null,
      room_id: b.room_id || null,
      room_number: authoritativeRoomNumber,
      room_name: authoritativeRoomName,
      booking_id: b.booking_id || null,
      booking_reference: booking?.booking_reference || booking?.bookingReference || null,
      guest_name: authoritativeGuestName,
      guest_email: authoritativeGuestEmail,
      guest_phone: authoritativeGuestPhone,
      check_in_date: authoritativeCheckIn,
      check_out_date: authoritativeCheckOut,
      found_by_staff_id: actorId,
      found_by_staff_name: actorName,
      storage_location: b.storage_location || null,
      storage_detail: b.storage_detail || null,
      condition: b.condition || 'good',
      estimated_value: b.estimated_value ?? null,
      internal_notes: b.internal_notes || null,
      notes: b.notes || null,
      photo_urls: photos,
      status: 'newly_found',
      created_at: now,
      updated_at: now
    };

    const r = await fetch(`${u}/rest/v1/lost_and_found`, { method: 'POST', headers: { ...restHeaders(k), Prefer: 'return=representation' }, body: JSON.stringify([row]) });
    if (!r.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create Lost & Found item' }) };
    const item = (await r.json())[0];

    await fetch(`${u}/rest/v1/lost_and_found_activity`, { method: 'POST', headers: { ...restHeaders(k), Prefer: 'return=minimal' }, body: JSON.stringify([{ business_id: t.businessId, item_id: item.id, event_type: 'created', employee_id: actorId, employee_name: actorName, notes: `Item created with tag ${tag}`, details: { tag_number: tag, item_name: b.item_name } }]) });
    if (photos.length) await fetch(`${u}/rest/v1/lost_and_found_activity`, { method: 'POST', headers: { ...restHeaders(k), Prefer: 'return=minimal' }, body: JSON.stringify([{ business_id: t.businessId, item_id: item.id, event_type: 'photos_added', employee_id: actorId, employee_name: actorName, notes: `${photos.length} photo(s) added (${photos.length} total)`, details: { previous_count: 0, new_count: photos.length } }]) });

    await audit(u, k, {
      business_id: t.businessId,
      user_id: actorId || '00000000-0000-0000-0000-000000000000',
      user_name: actorName || 'System',
      user_role: a.principal.role,
      action: 'lost_found_created',
      description: `Lost & Found item created: ${tag} — ${b.item_name}`,
      details: { item_id: item.id, tag_number: tag, photos: photos.length },
      booking_id: b.booking_id || null,
      guest_name: authoritativeGuestName,
      created_at: now
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, item }) };
  } catch (error) {
    console.error('create-lost-found-item fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create Lost & Found item' }) };
  }
};
