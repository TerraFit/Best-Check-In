// List housekeeping tasks + dashboard stats
// Uses Africa/Johannesburg for "today" so departures match the property calendar.

const { todayInJohannesburg } = require('./housekeeping-engine');

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});
  if (event.httpMethod !== 'GET') {
    return createResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const q = event.queryStringParameters || {};
    const { businessId, view, date, roomId, status } = q;
    if (!businessId) return createResponse(400, { error: 'businessId required' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    const todayStr = date || todayInJohannesburg();

    let filter = `business_id=eq.${businessId}`;
    if (roomId) filter += `&room_id=eq.${roomId}`;

    if (view === 'today') {
      filter += `&scheduled_date=eq.${todayStr}`;
      filter += `&status=in.(pending,in_progress)`;
    } else if (view === 'pending') {
      filter += `&status=in.(pending,in_progress)`;
    } else if (view === 'completed') {
      filter += `&status=eq.completed`;
    } else if (status) {
      filter += `&status=eq.${status}`;
    }
    // view === 'all' → no status filter (includes cancelled for audit)

    const url =
      `${supabaseUrl}/rest/v1/housekeeping_tasks?${filter}&select=*&order=scheduled_date.asc,created_at.asc`;

    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    const tasks = await res.json();

    const roomsRes = await fetch(
      `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&active=eq.true&select=id,housekeeping_status`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rooms = roomsRes.ok ? await roomsRes.json() : [];

    const allTasksRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&select=id,task_type,status,scheduled_date`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const allTasks = allTasksRes.ok ? await allTasksRes.json() : [];

    const stats = {
      rooms_clean: rooms.filter((r) =>
        ['clean', 'inspected'].includes(r.housekeeping_status)
      ).length,
      rooms_dirty: rooms.filter((r) =>
        ['dirty', 'full_service_required', 'refresh_required'].includes(r.housekeeping_status)
      ).length,
      refresh_due: allTasks.filter(
        (t) =>
          t.task_type === 'refresh' &&
          ['pending', 'in_progress'].includes(t.status) &&
          String(t.scheduled_date).slice(0, 10) <= todayStr
      ).length,
      full_service_due: allTasks.filter(
        (t) =>
          t.task_type === 'full_service' &&
          ['pending', 'in_progress'].includes(t.status) &&
          String(t.scheduled_date).slice(0, 10) <= todayStr
      ).length,
      completed_today: allTasks.filter(
        (t) =>
          t.status === 'completed' &&
          String(t.scheduled_date).slice(0, 10) === todayStr
      ).length,
      overdue: allTasks.filter(
        (t) =>
          ['pending', 'in_progress'].includes(t.status) &&
          String(t.scheduled_date).slice(0, 10) < todayStr
      ).length,
    };

    return createResponse(200, {
      success: true,
      tasks,
      stats,
      today: todayStr,
      businessId,
    });
  } catch (err) {
    console.error('get-housekeeping-tasks', err);
    return createResponse(500, { error: err.message || 'Internal error' });
  }
};
