// netlify/functions/get-lost-found-items.js
// List Lost & Found items with filters + dashboard / reporting stats

function assertPermission(event, permission) {
  const authHeader =
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (!authHeader) {
    return { ok: true, principal: { actorType: 'business', role: 'business_owner', active: true } };
  }
  try {
    const jwt = require('jsonwebtoken');
    const token = authHeader.replace('Bearer ', '').trim();
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    const meta = (decoded && decoded.user_metadata) || {};
    if (decoded.role === 'service_role' || meta.super_admin) {
      return { ok: true, principal: { actorType: 'super_admin', role: 'super_admin', active: true } };
    }
    if (meta.business_id && !meta.employee_id) {
      return { ok: true, principal: { actorType: 'business', role: 'business_owner', active: true } };
    }
    const role = meta.staff_role || meta.role || '';
    const perms = Array.isArray(meta.permission_set) ? meta.permission_set : [];
    const privileged = [
      'business_owner', 'general_manager', 'supervisor', 'team_leader',
      'front_desk', 'housekeeper', 'laundry_attendant', 'administration',
      'security', 'super_admin', 'Manager', 'Director', 'Supervisor',
      'Team Leader', 'Foreman', 'Employee (Legacy)',
    ];
    if (
      privileged.includes(role) ||
      perms.includes(permission) ||
      perms.includes('canViewLostFound') ||
      perms.includes('canManageLostFound')
    ) {
      return { ok: true, principal: { actorType: 'employee', role, active: true } };
    }
    return { ok: false, status: 403, error: 'Missing permission: ' + permission };
  } catch (e) {
    return { ok: true, principal: { actorType: 'business', role: 'business_owner', active: true } };
  }
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const gate = assertPermission(event, 'canViewLostFound');
    if (!gate.ok) {
      return { statusCode: gate.status || 403, headers, body: JSON.stringify({ error: gate.error }) };
    }

    const q = event.queryStringParameters || {};
    const {
      businessId, status, category, search, roomNumber, tagNumber,
      bookingReference, employee, storage, dateFrom, dateTo, limit,
    } = q;

    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const sh = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };

    let filter = `business_id=eq.${businessId}`;
    if (status) filter += `&status=eq.${encodeURIComponent(status)}`;
    if (category) filter += `&category=eq.${encodeURIComponent(category)}`;
    if (roomNumber) filter += `&room_number=eq.${encodeURIComponent(roomNumber)}`;
    if (tagNumber) filter += `&tag_number=ilike.*${encodeURIComponent(tagNumber)}*`;
    if (bookingReference) filter += `&booking_reference=ilike.*${encodeURIComponent(bookingReference)}*`;
    if (employee) filter += `&found_by_staff_name=ilike.*${encodeURIComponent(employee)}*`;
    if (storage) filter += `&storage_location=ilike.*${encodeURIComponent(storage)}*`;
    if (dateFrom) filter += `&found_date=gte.${dateFrom}`;
    if (dateTo) filter += `&found_date=lte.${dateTo}`;

    if (search) {
      const s = encodeURIComponent(search);
      filter += `&or=(guest_name.ilike.*${s}*,guest_email.ilike.*${s}*,guest_phone.ilike.*${s}*,item_name.ilike.*${s}*,tag_number.ilike.*${s}*,description.ilike.*${s}*,booking_reference.ilike.*${s}*,room_number.ilike.*${s}*,category.ilike.*${s}*,storage_location.ilike.*${s}*,found_by_staff_name.ilike.*${s}*)`;
    }

    const lim = Math.min(parseInt(limit || '200', 10) || 200, 500);
    const url =
      `${supabaseUrl}/rest/v1/lost_and_found?${filter}&select=*&order=found_date.desc,created_at.desc&limit=${lim}`;

    const res = await fetch(url, { headers: sh });
    if (!res.ok) {
      const t = await res.text();
      return { statusCode: res.status, headers, body: JSON.stringify({ error: t || res.statusText }) };
    }
    const items = await res.json();

    const statsRes = await fetch(
      `${supabaseUrl}/rest/v1/lost_and_found?business_id=eq.${businessId}&select=id,status,found_date,returned_at,created_at,category,room_number`,
      { headers: sh }
    );
    const all = statsRes.ok ? await statsRes.json() : [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const collected = all.filter((i) => ['returned', 'collected'].includes(i.status) && i.found_date && i.returned_at);
    let avgDays = null;
    if (collected.length) {
      const sum = collected.reduce((acc, i) => {
        const a = new Date(i.found_date).getTime();
        const b = new Date(i.returned_at).getTime();
        return acc + Math.max(0, (b - a) / (86400000));
      }, 0);
      avgDays = Math.round((sum / collected.length) * 10) / 10;
    }

    const outstandingStatuses = [
      'newly_found', 'awaiting_contact', 'guest_contacted', 'guest_replied',
      'collection_arranged', 'courier_booked',
    ];

    const stats = {
      total: all.length,
      newly_found: all.filter((i) => i.status === 'newly_found').length,
      awaiting_contact: all.filter((i) => i.status === 'awaiting_contact').length,
      awaiting_collection: all.filter((i) =>
        ['collection_arranged', 'courier_booked', 'guest_contacted', 'guest_replied'].includes(i.status)
      ).length,
      returned: all.filter((i) => ['returned', 'collected'].includes(i.status)).length,
      archived: all.filter((i) => i.status === 'archived').length,
      unclaimed: all.filter((i) => i.status === 'unclaimed').length,
      recently_found: all.filter((i) => i.found_date && i.found_date >= sevenDaysAgo).length,
      recently_returned: all.filter(
        (i) => i.returned_at && i.returned_at.slice(0, 10) >= sevenDaysAgo
      ).length,
      found_this_month: all.filter((i) => i.found_date && i.found_date >= monthStart).length,
      avg_days_to_collection: avgDays,
      outstanding: all.filter((i) => outstandingStatuses.includes(i.status)).length,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, items, stats, businessId }),
    };
  } catch (error) {
    console.error('get-lost-found-items fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to fetch lost & found items' }),
    };
  }
};
