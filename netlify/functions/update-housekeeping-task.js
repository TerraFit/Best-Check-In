// Update task status, assignment, notes, inspection — syncs room housekeeping_status

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

async function sb(path, options = {}) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(typeof data === 'object' && data?.message ? data.message : text);
  return data;
}

function roomPatch(task, nextStatus, inspection) {
  if (nextStatus === 'in_progress') {
    return { housekeeping_status: 'cleaning_in_progress' };
  }
  if (nextStatus === 'skipped') {
    return { housekeeping_status: 'clean' };
  }
  if (nextStatus === 'completed') {
    if (inspection === 'rejected') return { housekeeping_status: 'cleaning_in_progress' };
    if (inspection === 'approved') {
      const p = { housekeeping_status: 'clean' };
      if (task.is_checkout) p.occupancy_status = 'vacant';
      return p;
    }
    return { housekeeping_status: 'awaiting_inspection' };
  }
  if (nextStatus === 'pending' && task.is_checkout) {
    return { occupancy_status: 'departure_pending', housekeeping_status: 'dirty' };
  }
  return {};
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});
  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      businessId,
      taskId,
      status,
      notes,
      assigned_staff_id,
      assigned_staff_name,
      inspection_status,
      completed_by,
    } = body;

    if (!businessId || !taskId) {
      return createResponse(400, { error: 'businessId and taskId required' });
    }

    const rows = await sb(
      `housekeeping_tasks?id=eq.${taskId}&business_id=eq.${businessId}&select=*`
    );
    const task = rows?.[0];
    if (!task) return createResponse(404, { error: 'Task not found' });

    // Skip only allowed for refresh
    if (status === 'skipped' && task.task_type !== 'refresh') {
      return createResponse(400, { error: 'Only Refresh tasks can be skipped' });
    }

    const patch = { updated_at: new Date().toISOString() };
    if (status) patch.status = status;
    if (notes !== undefined) patch.notes = notes;
    if (assigned_staff_id !== undefined) patch.assigned_staff_id = assigned_staff_id;
    if (assigned_staff_name !== undefined) patch.assigned_staff_name = assigned_staff_name;
    if (inspection_status !== undefined) patch.inspection_status = inspection_status;

    if (status === 'in_progress') {
      patch.started_at = new Date().toISOString();
    }
    if (status === 'completed') {
      patch.completed_at = new Date().toISOString();
      if (completed_by) patch.completed_by = completed_by;
      if (!inspection_status) patch.inspection_status = 'pending';
    }
    if (inspection_status === 'approved' || inspection_status === 'rejected') {
      // ensure completed
      if (task.status !== 'completed') patch.status = 'completed';
    }

    const updated = await sb(`housekeeping_tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    const next = updated?.[0] || { ...task, ...patch };

    // Room status sync
    const effectiveStatus = status || task.status;
    const insp = inspection_status || null;
    const rPatch = roomPatch(task, effectiveStatus, insp);
    if (Object.keys(rPatch).length) {
      rPatch.updated_at = new Date().toISOString();
      await sb(`rooms?id=eq.${task.room_id}`, {
        method: 'PATCH',
        body: JSON.stringify(rPatch),
        prefer: 'return=minimal',
      });
    }

    // Timeline
    try {
      await sb('room_events', {
        method: 'POST',
        body: JSON.stringify({
          business_id: businessId,
          room_id: task.room_id,
          event_type: inspection_status
            ? `housekeeping_inspection_${inspection_status}`
            : `housekeeping_task_${status || 'updated'}`,
          source: 'staff',
          severity: 'info',
          booking_id: task.booking_id,
          guest_name: task.guest_name,
          details: {
            task_id: taskId,
            task_type: task.task_type,
            status: next.status,
            inspection_status: next.inspection_status,
          },
        }),
      });
    } catch (e) {
      console.warn('room_events', e.message);
    }

    return createResponse(200, { success: true, task: next });
  } catch (err) {
    console.error('update-housekeeping-task', err);
    return createResponse(500, { error: err.message || 'Internal error' });
  }
};
