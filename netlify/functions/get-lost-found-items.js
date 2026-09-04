// Lost & Found list/reporting endpoint.
import auth from './_auth.cjs';
const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const hasPhotos = (r) => Array.isArray(r.photo_urls) && r.photo_urls.some(Boolean);
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  const a = requireBusinessActor(event); if (!a.ok) return authFailure(a, headers);
  if (!requireBusinessPermission(a.principal, 'canViewLostFound')) return authFailure({ status: 403, error: 'Missing permission: canViewLostFound' }, headers);
  try {
    const q = event.queryStringParameters || {}, t = resolveTenant(a.principal, q.businessId); if (!t.ok) return authFailure(t, headers);
    const { businessId } = t, url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    const sh = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    let filter = `business_id=eq.${encodeURIComponent(businessId)}`;
    for (const [k, col] of [['status','status'],['category','category'],['roomNumber','room_number'],['tagNumber','tag_number'],['bookingReference','booking_reference'],['employee','found_by_staff_name'],['storage','storage_location']]) if (q[k]) filter += `&${col}=${k === 'tagNumber' || k === 'bookingReference' || k === 'employee' || k === 'storage' ? 'ilike.*' + encodeURIComponent(q[k]) + '*' : 'eq.' + encodeURIComponent(q[k])}`;
    if (q.dateFrom) filter += `&found_date=gte.${encodeURIComponent(q.dateFrom)}`; if (q.dateTo) filter += `&found_date=lte.${encodeURIComponent(q.dateTo)}`;
    if (q.search) { const s = encodeURIComponent(q.search); filter += `&or=(guest_name.ilike.*${s}*,guest_email.ilike.*${s}*,guest_phone.ilike.*${s}*,item_name.ilike.*${s}*,tag_number.ilike.*${s}*,description.ilike.*${s}*,booking_reference.ilike.*${s}*,room_number.ilike.*${s}*,category.ilike.*${s}*,storage_location.ilike.*${s}*,found_by_staff_name.ilike.*${s}*)`; }
    const lim = Math.min(parseInt(q.limit || '200', 10) || 200, 500);
    const r = await fetch(`${url}/rest/v1/lost_and_found?${filter}&select=*&order=found_date.desc,created_at.desc&limit=${lim}`, { headers: sh });
    if (!r.ok) { console.error('get-lost-found-items query failed:', r.status); return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch Lost & Found items' }) }; }
    const items = await r.json();
    const sr = await fetch(`${url}/rest/v1/lost_and_found?business_id=eq.${encodeURIComponent(businessId)}&select=id,status,found_date,returned_at,created_at,photo_urls`, { headers: sh });
    if (!sr.ok) { console.error('get-lost-found-items stats query failed:', sr.status); return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to calculate Lost & Found statistics' }) }; }
    const all = await sr.json();
    const now = new Date(), day = new Date(now); day.setDate(day.getDate() - 7); const dayBoundary = day.toISOString().slice(0, 10), month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, thirty = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10), open = ['newly_found','awaiting_contact','guest_contacted','guest_replied','collection_arranged','courier_booked'];
    const returned = all.filter(i => ['returned','collected'].includes(i.status) && i.found_date && i.returned_at), avg = returned.length ? Math.round(returned.reduce((s, i) => s + Math.max(0, (new Date(i.returned_at) - new Date(i.found_date)) / 86400000), 0) / returned.length * 10) / 10 : null;
    const stats = { total: all.length, newly_found: all.filter(i => i.status === 'newly_found').length, awaiting_contact: all.filter(i => ['newly_found','awaiting_contact'].includes(i.status)).length, awaiting_collection: all.filter(i => ['collection_arranged','courier_booked','guest_contacted','guest_replied'].includes(i.status)).length, ready_for_collection: all.filter(i => ['collection_arranged','courier_booked'].includes(i.status)).length, missing_photos: all.filter(i => open.includes(i.status) && !hasPhotos(i)).length, overdue: all.filter(i => open.includes(i.status) && i.found_date && i.found_date < thirty).length, returned: all.filter(i => ['returned','collected'].includes(i.status)).length, archived: all.filter(i => i.status === 'archived').length, unclaimed: all.filter(i => i.status === 'unclaimed').length, recently_found: all.filter(i => i.found_date && i.found_date >= dayBoundary).length, recently_returned: all.filter(i => i.returned_at && String(i.returned_at).slice(0, 10) >= dayBoundary).length, found_this_month: all.filter(i => i.found_date && i.found_date >= month).length, avg_days_to_collection: avg, outstanding: all.filter(i => open.includes(i.status)).length };
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, items, stats, businessId }) };
  } catch (error) { console.error('get-lost-found-items fatal:', error); return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch Lost & Found items' }) }; }
};
