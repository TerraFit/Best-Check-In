// netlify/functions/get-housekeeping-tasks.js
// RBAC: canViewHousekeeping when JWT present
// Includes active service sessions so timers survive browser sleep/reload.
// Phase 0: authentication is mandatory and business scope is JWT-bound.
// Read access does not require a live employee-status lookup; execution endpoints do.

const { authenticateHousekeepingService, resolveBusinessId } = require('./_housekeepingServiceAuth.cjs');

const TASK_SELECT = [
  'id', 'business_id', 'room_id', 'room_number', 'room_name', 'booking_id', 'guest_name',
  'task_type', 'is_checkout', 'scheduled_date', 'priority', 'status', 'assigned_staff_id',
  'assigned_staff_name', 'notes', 'started_at', 'completed_at', 'completed_by',
  'inspection_status', 'policy_used', 'created_at', 'updated_at',
].join(',');

const SESSION_SELECT = [
  'id', 'business_id', 'housekeeping_task_id', 'room_id', 'booking_id', 'employee_id',
  'employee_name', 'service_type', 'room_type_snapshot', 'target_minutes_snapshot',
  'warning_minutes_snapshot', 'started_at', 'completed_at', 'actual_seconds', 'status',
  'checklist_completed_count', 'checklist_total_count', 'issues_reported_count',
  'checklist_state', 'quality_result', 'rework_started_at', 'rework_completed_at',
  'rework_seconds', 'notes', 'takeover_from_session_id', 'takeover_reason', 'taken_over_at', 'taken_over_by', 'created_at', 'updated_at',
].join(',');

function isReadyStatus(s) { return ['ready', 'clean', 'inspected'].includes(s); }
function isNotReadyStatus(s) { return ['not_ready', 'dirty', 'full_service_required', 'refresh_required'].includes(s); }
function isMaintenanceRoom(r) { return !r.active || ['out_of_order', 'maintenance', 'unavailable'].includes(r.availability_status); }

function upstreamFailure(status, context) {
  console.error(`get-housekeeping-tasks ${context} upstream failure:`, { status });
  return { statusCode: 502, error: 'Failed to fetch housekeeping data' };
}

async function fetchAllRows(url, headers, pageSize = 1000) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(url, {
      headers: { ...headers, 'Range-Unit': 'items', Range: `${offset}-${offset + pageSize - 1}` },
    });
    if (!response.ok) return { ok: false, status: response.status, rows: [] };
    const page = await response.json();
    if (!Array.isArray(page)) return { ok: false, status: 502, rows: [] };
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return { ok: true, rows };
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const gate = authenticateHousekeepingService(event, 'view');
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
    const todayStr = date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const todayStart = new Date(`${todayStr}T00:00:00+02:00`);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const cutoffToday = new Date(`${todayStr}T14:00:00+02:00`);
    const isOverdue = (task) => {
      if (!['pending', 'in_progress'].includes(task.status)) return false;
      if (task.scheduled_date < todayStr) return true;
      return task.scheduled_date === todayStr && now >= cutoffToday;
    };

    // Keep the operational dashboard room-oriented: one card per room.
    // Select from the tasks relevant to the current view before collapsing history,
    // so a future checkout task cannot hide a Refresh due today.
    const roomFilter = roomId ? `&room_id=eq.${encodeURIComponent(roomId)}` : '';
    const allRes = await fetchAllRows(`${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}${roomFilter}&select=${TASK_SELECT}&order=scheduled_date.asc,created_at.asc,id.asc`, restHeaders);
    if (!allRes.ok) return (() => { const e = upstreamFailure(allRes.status, 'housekeeping tasks'); return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) }; })();
    const allTasks = allRes.rows;
    const roomKey = (task) => task.room_id || `room:${task.room_number ?? ''}:${task.room_name ?? ''}`;
    const recency = (task) => new Date(task.updated_at || task.created_at || task.scheduled_date || 0).getTime() || 0;
    const latestPerRoom = (candidateTasks) => {
      const latestByRoom = new Map();
      for (const task of candidateTasks) {
        const key = roomKey(task);
        const current = latestByRoom.get(key);
        if (!current || recency(task) > recency(current) ||
            (recency(task) === recency(current) && String(task.id) > String(current.id))) {
          latestByRoom.set(key, task);
        }
      }
      return [...latestByRoom.values()];
    };
    let tasks = [];
    if (view === 'today') {
      // Today includes pending/in-progress work due today or overdue, plus
      // tasks completed today. Pending must not disappear from the Today view.
      const todayCandidates = allTasks.filter((task) =>
        (['pending', 'in_progress'].includes(task.status) && task.scheduled_date <= todayStr) ||
        (task.status === 'completed' && task.completed_at &&
          new Date(task.completed_at) >= todayStart && new Date(task.completed_at) < tomorrowStart)
      );
      tasks = latestPerRoom(todayCandidates);
    } else if (view === 'pending') {
      const openTasks = allTasks.filter((task) => ['pending', 'in_progress'].includes(task.status));
      const dueTasks = openTasks.filter((task) => task.scheduled_date <= todayStr);
      const roomsWithDueTasks = new Set(dueTasks.map(roomKey));
      // Show current/overdue work before future scheduled services for the same room.
      const futureTasks = openTasks.filter((task) => task.scheduled_date > todayStr && !roomsWithDueTasks.has(roomKey(task)));
      tasks = latestPerRoom([...dueTasks, ...futureTasks]);
    } else if (view === 'completed') {
      tasks = latestPerRoom(allTasks.filter((task) => task.status === 'completed'));
    } else if (status) {
      tasks = latestPerRoom(allTasks.filter((task) => task.status === status));
    } else {
      tasks = latestPerRoom(allTasks);
    }
    tasks.sort((a, b) =>
      String(a.scheduled_date || '').localeCompare(String(b.scheduled_date || '')) ||
      String(a.room_number || '').localeCompare(String(b.room_number || ''))
    );
    const roomIds = [...new Set(tasks.map((t) => t.room_id).filter(Boolean))];
    const roomsById = {};
    if (roomIds.length) {
      const roomsLookup = await fetchAllRows(`${supabaseUrl}/rest/v1/rooms?business_id=eq.${encodeURIComponent(businessId)}&id=in.(${roomIds.map(encodeURIComponent).join(',')})&select=id,room_type,floor,housekeeping_status,occupancy_status,availability_status,active`, restHeaders);
      if (!roomsLookup.ok) console.error('get-housekeeping-tasks rooms lookup failed:', { status: roomsLookup.status });
      else for (const room of roomsLookup.rows) roomsById[room.id] = room;
    }

    const activeSessionsByTask = {};
    const sessionsRes = await fetchAllRows(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?business_id=eq.${encodeURIComponent(businessId)}&status=eq.active&select=${SESSION_SELECT}&order=started_at.desc,id.asc`, restHeaders);
    if (!sessionsRes.ok) {
      const e = upstreamFailure(sessionsRes.status, 'active service sessions');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    for (const session of sessionsRes.rows) {
      const taskKey = session.housekeeping_task_id || session.task_id;
      if (taskKey && !activeSessionsByTask[taskKey]) activeSessionsByTask[taskKey] = session;
    }

    // Determine skip eligibility server-side so Employee and Business portals use the same rule.
    // A Refresh may be skipped when it is the oldest currently-pending overdue Refresh
    // for the room AND either there are at least two pending overdue Refresh services,
    // or an older overdue Refresh has already been skipped. This makes the next-oldest
    // task eligible immediately after the oldest is skipped, without allowing a lone
    // first-time overdue Refresh to be skipped.
    const overdueRefreshOpen = tasks.filter((task) =>
      task.status === 'pending' &&
      task.task_type === 'refresh' &&
      !task.is_checkout &&
      task.scheduled_date < todayStr,
    );
    const skippedRefreshRes = await fetchAllRows(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&status=eq.skipped&task_type=eq.refresh&is_checkout=eq.false&scheduled_date=lt.${encodeURIComponent(todayStr)}&select=id,room_id,room_number,room_name,scheduled_date,created_at&order=scheduled_date.asc,created_at.asc,id.asc`,
      restHeaders,
    );
    if (!skippedRefreshRes.ok) {
      const e = upstreamFailure(skippedRefreshRes.status, 'skipped Refresh history');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    const skippedRefreshTasks = skippedRefreshRes.rows;

    const compareTasks = (a, b) =>
      String(a.scheduled_date).localeCompare(String(b.scheduled_date)) ||
      String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
      String(a.id).localeCompare(String(b.id));
    const openByRoom = new Map();
    for (const task of overdueRefreshOpen) {
      const key = roomKey(task);
      const list = openByRoom.get(key) || [];
      list.push(task);
      openByRoom.set(key, list);
    }
    for (const list of openByRoom.values()) list.sort(compareTasks);

    const skippedByRoom = new Map();
    for (const task of skippedRefreshTasks) {
      const key = roomKey(task);
      const list = skippedByRoom.get(key) || [];
      list.push(task);
      skippedByRoom.set(key, list);
    }

    const canSkipTaskIds = new Set();
    for (const [key, list] of openByRoom.entries()) {
      if (!list.length) continue;
      const oldestOpen = list[0];
      const priorSkipped = (skippedByRoom.get(key) || []).some((skipped) => compareTasks(skipped, oldestOpen) < 0);
      if (list.length >= 2 || priorSkipped) canSkipTaskIds.add(oldestOpen.id);
    }

    const enrichedTasks = tasks.map((task) => ({
      ...task,
      room_type: roomsById[task.room_id]?.room_type || task.room_type || null,
      room_floor: roomsById[task.room_id]?.floor ?? task.room_floor ?? null,
      active_session: activeSessionsByTask[task.id] || null,
      // Any pending task without an active session may be deliberately removed from
      // the operational queue. The authoritative endpoint re-checks this server-side.
      can_ignore: task.status === 'pending' && !activeSessionsByTask[task.id],
      is_overdue: isOverdue(task),
      overdue_since: isOverdue(task) ? (task.scheduled_date < todayStr ? `${task.scheduled_date}T14:00:00+02:00` : `${todayStr}T14:00:00+02:00`) : null,
      can_skip_oldest: canSkipTaskIds.has(task.id),
    }));

    const roomsRes = await fetchAllRows(`${supabaseUrl}/rest/v1/rooms?business_id=eq.${encodeURIComponent(businessId)}&active=eq.true&select=id,housekeeping_status,occupancy_status,availability_status,active`, restHeaders);
    if (!roomsRes.ok) {
      const e = upstreamFailure(roomsRes.status, 'stats rooms lookup');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    const rooms = roomsRes.rows;
    const todayTasksRes = await fetchAllRows(`${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&scheduled_date=eq.${encodeURIComponent(todayStr)}&status=in.(pending,in_progress)&select=id,task_type,status,scheduled_date,is_checkout`, restHeaders);
    if (!todayTasksRes.ok) {
      const e = upstreamFailure(todayTasksRes.status, 'today stats tasks');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    const todayOpenTasks = todayTasksRes.rows;
    const completedTodayRes = await fetchAllRows(`${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&status=eq.completed&completed_at=gte.${encodeURIComponent(todayStart.toISOString())}&completed_at=lt.${encodeURIComponent(tomorrowStart.toISOString())}&select=id`, restHeaders);
    if (!completedTodayRes.ok) {
      const e = upstreamFailure(completedTodayRes.status, 'completed today stats');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    const completedToday = completedTodayRes.rows;
    const overdueRes = await fetchAllRows(`${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${encodeURIComponent(businessId)}&scheduled_date=lt.${encodeURIComponent(todayStr)}&status=in.(pending,in_progress)&select=id`, restHeaders);
    if (!overdueRes.ok) {
      const e = upstreamFailure(overdueRes.status, 'overdue stats');
      return { statusCode: e.statusCode, headers, body: JSON.stringify({ error: e.error }) };
    }
    const historicalOverdueTasks = overdueRes.rows;
    const overdueTasks = [...historicalOverdueTasks, ...todayOpenTasks.filter((task) => isOverdue(task))];

    let roomsReady = 0, roomsNotReady = 0, roomsCleaning = 0, roomsAwaiting = 0, roomsMaintenance = 0;
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
      rooms_ready: roomsReady, rooms_not_ready: roomsNotReady, rooms_clean: roomsReady, rooms_dirty: roomsNotReady,
      rooms_cleaning: roomsCleaning, rooms_awaiting_inspection: roomsAwaiting, rooms_maintenance: roomsMaintenance,
      refresh_due: todayOpenTasks.filter((t) => t.task_type === 'refresh').length,
      full_service_due: todayOpenTasks.filter((t) => t.task_type === 'full_service').length,
      completed_today: completedToday.length, overdue: overdueTasks.length,
    };
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, tasks: enrichedTasks, stats, today: todayStr, businessId }) };
  } catch (error) {
    console.error('get-housekeeping-tasks fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch housekeeping tasks' }) };
  }
};
