// netlify/functions/get-housekeeping-tasks.js
// Stats use readiness terminology:
//   Ready     = ready | clean | inspected
//   Not Ready = not_ready | dirty | full_service_required | refresh_required
// cleaning_in_progress / awaiting_inspection are neither Ready nor Not Ready counts.

function isReadyStatus(s) {
  return ['ready', 'clean', 'inspected'].includes(s);
}

function isNotReadyStatus(s) {
  return ['not_ready', 'dirty', 'full_service_required', 'refresh_required'].includes(s);
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
      `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&active=eq.true&select=id,housekeeping_status,occupancy_status`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    const rooms = roomsRes.ok ? await roomsRes.json() : [];

    const allTasksRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&select=id,task_type,status,scheduled_date,is_checkout`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    const allTasks = allTasksRes.ok ? await allTasksRes.json() : [];

    const roomsReady = rooms.filter((r) => isReadyStatus(r.housekeeping_status)).length;
    const roomsNotReady = rooms.filter((r) => isNotReadyStatus(r.housekeeping_status)).length;

    const stats = {
      rooms_ready: roomsReady,
      rooms_not_ready: roomsNotReady,
      // Backward-compatible aliases
      rooms_clean: roomsReady,
      rooms_dirty: roomsNotReady,
      rooms_cleaning: rooms.filter((r) => r.housekeeping_status === 'cleaning_in_progress').length,
      rooms_awaiting_inspection: rooms.filter((r) => r.housekeeping_status === 'awaiting_inspection')
        .length,
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
