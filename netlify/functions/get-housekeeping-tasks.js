// netlify/functions/get-housekeeping-tasks.js
// Stats + tasks list. Requires canViewHousekeeping when JWT present.

const { assertPermission } = require('./_rbac');

function isReadyStatus(s) {
  return ['ready', 'clean', 'inspected'].includes(s);
}

function isNotReadyStatus(s) {
  return ['not_ready', 'dirty', 'full_service_required', 'refresh_required'].includes(s);
}

function isMaintenanceRoom(r) {
  return (
    !r.active ||
    r.availability_status === 'out_of_order' ||
    r.availability_status === 'maintenance' ||
    r.availability_status === 'unavailable'
  );
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
    const gate = assertPermission(event, 'canViewHousekeeping');
    if (!gate.ok) {
      return {
        statusCode: gate.status || 403,
        headers,
        body: JSON.stringify({ error: gate.error }),
      };
    }

    const q = event.queryStringParameters || {};
    const { businessId, view, date, roomId, status } = q;
    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const todayStr =
      date ||
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Johannesburg',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

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

    const url =
      `${supabaseUrl}/rest/v1/housekeeping_tasks?${filter}&select=*&order=scheduled_date.asc,created_at.asc`;

    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const t = await res.text();
      return { statusCode: res.status, headers, body: JSON.stringify({ error: t || res.statusText }) };
    }
    const tasks = await res.json();

    const roomsRes = await fetch(
      `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&active=eq.true&select=id,housekeeping_status,occupancy_status,availability_status,active`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    const rooms = roomsRes.ok ? await roomsRes.json() : [];

    const todayTasksRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&scheduled_date=eq.${todayStr}&status=in.(pending,in_progress)&select=id,task_type,status,scheduled_date,is_checkout`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    const todayOpenTasks = todayTasksRes.ok ? await todayTasksRes.json() : [];

    const completedTodayRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&scheduled_date=eq.${todayStr}&status=eq.completed&select=id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    const completedToday = completedTodayRes.ok ? await completedTodayRes.json() : [];

    const overdueRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&scheduled_date=lt.${todayStr}&status=in.(pending,in_progress)&select=id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    const overdueTasks = overdueRes.ok ? await overdueRes.json() : [];

    let roomsReady = 0;
    let roomsNotReady = 0;
    let roomsCleaning = 0;
    let roomsAwaiting = 0;
    let roomsMaintenance = 0;

    for (const r of rooms) {
      if (isMaintenanceRoom(r)) {
        roomsMaintenance += 1;
        continue;
      }
      if (r.housekeeping_status === 'do_not_disturb') continue;
      if (r.housekeeping_status === 'cleaning_in_progress') {
        roomsCleaning += 1;
        continue;
      }
      if (r.housekeeping_status === 'awaiting_inspection') {
        roomsAwaiting += 1;
        continue;
      }
      if (isNotReadyStatus(r.housekeeping_status)) {
        roomsNotReady += 1;
        continue;
      }
      if (isReadyStatus(r.housekeeping_status)) {
        roomsReady += 1;
        continue;
      }
      roomsReady += 1;
    }

    const refreshDue = todayOpenTasks.filter((t) => t.task_type === 'refresh').length;
    const fullServiceDue = todayOpenTasks.filter((t) => t.task_type === 'full_service').length;

    const stats = {
      rooms_ready: roomsReady,
      rooms_not_ready: roomsNotReady,
      rooms_clean: roomsReady,
      rooms_dirty: roomsNotReady,
      rooms_cleaning: roomsCleaning,
      rooms_awaiting_inspection: roomsAwaiting,
      rooms_maintenance: roomsMaintenance,
      refresh_due: refreshDue,
      full_service_due: fullServiceDue,
      completed_today: completedToday.length,
      overdue: overdueTasks.length,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tasks,
        stats,
        today: todayStr,
        businessId,
      }),
    };
  } catch (error) {
    console.error('get-housekeeping-tasks fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to fetch housekeeping tasks' }),
    };
  }
};
