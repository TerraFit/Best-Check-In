// netlify/functions/get-housekeeping-tasks.js
// RBAC: canViewHousekeeping when JWT present
// Includes active service sessions so timers survive browser sleep/reload.
// Phase 0: authentication is mandatory and business scope is JWT-bound.

const {
  authenticateHousekeepingServiceLive,
  resolveBusinessId,
} = require('./_housekeepingServiceAuth.cjs');

function isReadyStatus(s) {
  return ['ready', 'clean', 'inspected'].includes(s);
}
function isNotReadyStatus(s) {
  return ['not_ready', 'dirty', 'full_service_required', 'refresh_required'].includes(s);
}
function isMaintenanceRoom(r) {
  return !r.active || ['out_of_order', 'maintenance', 'unavailable'].includes(r.availability_status);
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const gate = await authenticateHousekeepingServiceLive(event, 'view');
    if (!gate.ok) return { statusCode: gate.status || 403, headers, body: JSON.stringify({ error: gate.error, code: gate.code }) };

    const q = event.queryStringParameters || {};
    const { businessId: requestedBusinessId, view, date, roomId, status } = q;
    const scope = resolveBusinessId(gate.principal, requestedBusinessId || null);
    if (!scope.ok) return { statusCode: scope.status, headers, body: JSON.stringify({ error: scope.error }) };
    const businessId = scope.businessId;

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    const restHeaders = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const todayStr = date || new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const todayStart = new Date(`${todayStr}T00:00:00+02:00`);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    let tasks;
    if (view === 'today') {
      // Today's operational board is a calculated union:
      // - today's pending/in-progress work
      // - older open work shown as Behind
      // - anything completed today, regardless of its scheduled date
      const roomFilter = roomId ? `&room_id=eq.${encodeURIComponent(roomId)}` : '';
      const openRes = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&scheduled_date=lte.${encodeURIComponent(todayStr)}&status=in.(pending,in_progress)${roomFilter}&select=*&order=scheduled_date.asc,created_at.asc`,
        { headers: restHeaders }
      );
      if (!openRes.ok) {
        const text = await openRes.text();
        return { statusCode: openRes.status, headers, body: JSON.stringify({ error: text || openRes.statusText }) };
      }

      const completedRes = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&status=eq.completed&completed_at=gte.${encodeURIComponent(todayStart.toISOString())}&completed_at=lt.${encodeURIComponent(tomorrowStart.toISOString())}${roomFilter}&select=*&order=completed_at.asc`,
        { headers: restHeaders }
      );
      if (!completedRes.ok) {
        const text = await completedRes.text();
        return { statusCode: completedRes.status, headers, body: JSON.stringify({ error: text || completedRes.statusText }) };
      }

      const combined = [...await openRes.json(), ...await completedRes.json()];
      const byId = new Map();
      for (const task of combined) byId.set(task.id, task);
      tasks = [...byId.values()].sort((a, b) => {
        const aDate = a.status === 'completed' ? (a.completed_at || a.scheduled_date) : a.scheduled_date;
        const bDate = b.status === 'completed' ? (b.completed_at || b.scheduled_date) : b.scheduled_date;
        return String(aDate).localeCompare(String(bDate));
      });
    } else {
      let filter = `business_id=eq.${encodeURIComponent(businessId)}`;
      if (roomId) filter += `&room_id=eq.${encodeURIComponent(roomId)}`;
      if (view === 'pending') {
        filter += '&status=in.(pending,in_progress)';
      } else if (view === 'completed') {
        filter += '&status=eq.completed';
      } else if (status) {
        filter += `&status=eq.${encodeURIComponent(status)}`;
      }

      const res = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_tasks?${filter}&select=*&order=scheduled_date.asc,created_at.asc`,
        { headers: restHeaders }
      );
      if (!res.ok) {
        const text = await res.text();
        return { statusCode: res.status, headers, body: JSON.stringify({ error: text || res.statusText }) };
      }
      tasks = await res.json();
    }

    const roomIds = [...new Set(tasks.map((t) => t.room_id).filter(Boolean))];
    const roomsById = {};
    if (roomIds.length) {
      const roomsLookup = await fetch(
        `${supabaseUrl}/rest/v1/rooms?business_id=eq.${encodeURIComponent(businessId)}&id=in.(${roomIds.map(encodeURIComponent).join(',')})&select=id,room_type,housekeeping_status,occupancy_status,availability_status,active`,
        { headers: restHeaders }
      );
      if (roomsLookup.ok) {
        for (const room of await roomsLookup.json()) roomsById[room.id] = room;
      }
    }

    const activeSessionsByTask = {};
    const sessionsRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?business_id=eq.${encodeURIComponent(businessId)}&status=eq.active&select=*&order=started_at.desc`,
      { headers: restHeaders }
    );
    if (sessionsRes.ok) {
      for (const session of await sessionsRes.json()) {
        const taskKey = session.housekeeping_task_id || session.task_id;
        if (taskKey && !activeSessionsByTask[taskKey]) activeSessionsByTask[taskKey] = session;
      }
    }

    const enrichedTasks = tasks.map((task) => ({
      ...task,
      room_type: roomsById[task.room_id]?.room_type || task.room_type || null,
      active_session: activeSessionsByTask[task.id] || null,
    }));

    const roomsRes = await fetch(
      `${supabaseUrl}/rest/v1/rooms?business_id=eq.${encodeURIComponent(businessId)}&active=eq.true&select=id,housekeeping_status,occupancy_status,availability_status,active`,
      { headers: restHeaders }
    );
    const rooms = roomsRes.ok ? await roomsRes.json() : [];

    const todayTasksRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&scheduled_date=eq.${encodeURIComponent(todayStr)}&status=in.(pending,in_progress)&select=id,task_type,status,scheduled_date,is_checkout`,
      { headers: restHeaders }
    );
    const todayOpenTasks = todayTasksRes.ok ? await todayTasksRes.json() : [];

    const completedTodayRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&status=eq.completed&completed_at=gte.${encodeURIComponent(todayStart.toISOString())}&completed_at=lt.${encodeURIComponent(tomorrowStart.toISOString())}&select=id`,
      { headers: restHeaders }
    );
    const completedToday = completedTodayRes.ok ? await completedTodayRes.json() : [];

    const overdueRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&scheduled_date=lt.${encodeURIComponent(todayStr)}&status=in.(pending,in_progress)&select=id`,
      { headers: restHeaders }
    );
    const overdueTasks = overdueRes.ok ? await overdueRes.json() : [];

    let roomsReady = 0;
    let roomsNotReady = 0;
    let roomsCleaning = 0;
    let roomsAwaiting = 0;
    let roomsMaintenance = 0;
    for (const r of rooms) {
      if (isMaintenanceRoom(r)) { roomsMaintenance += 1; continue; }
      if (r.housekeeping_status === 'do_not_disturb') continue;
      if (r.housekeeping_status === 'cleaning_in_progress') { roomsCleaning += 1; continue; }
      if (r.housekeeping_status === 'awaiting_inspection') { roomsAwaiting += 1; continue; }
      if (isNotReadyStatus(r.housekeeping_status)) { roomsNotReady += 1; continue; }
      if (isReadyStatus(r.housekeeping_status)) { roomsReady += 1; continue; }
      roomsReady += 1;
    }

    const stats = {
      rooms_ready: roomsReady,
      rooms_not_ready: roomsNotReady,
      rooms_clean: roomsReady,
      rooms_dirty: roomsNotReady,
      rooms_cleaning: roomsCleaning,
      rooms_awaiting_inspection: roomsAwaiting,
      rooms_maintenance: roomsMaintenance,
      refresh_due: todayOpenTasks.filter((t) => t.task_type === 'refresh').length,
      full_service_due: todayOpenTasks.filter((t) => t.task_type === 'full_service').length,
      completed_today: completedToday.length,
      overdue: overdueTasks.length,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, tasks: enrichedTasks, stats, today: todayStr, businessId }),
    };
  } catch (error) {
    console.error('get-housekeeping-tasks fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Failed to fetch housekeeping tasks' }) };
  }
};
