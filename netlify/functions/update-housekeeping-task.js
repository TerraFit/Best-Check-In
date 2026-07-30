// netlify/functions/update-housekeeping-task.js
// Room Readiness state machine (independent of occupancy):
//   Start      → Cleaning in Progress
//   Complete   → Awaiting Inspection  (NOT Ready)
//   Approve    → Ready (+ Vacant if checkout)
//   Reject     → Cleaning in Progress
// Ready is NEVER set on Complete alone.

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId and taskId required' }),
      };
    }

    const restHeaders = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      Accept: 'application/json',
    };

    const taskRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${taskId}&business_id=eq.${businessId}&select=*`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    if (!taskRes.ok) {
      const err = await taskRes.text();
      return { statusCode: taskRes.status, headers, body: JSON.stringify({ error: err }) };
    }
    const rows = await taskRes.json();
    const task = rows[0];
    if (!task) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Task not found' }) };
    }

    if (status === 'skipped') {
      if (task.task_type !== 'refresh' || task.is_checkout) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Only non-checkout Refresh tasks can be skipped' }),
        };
      }
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
      if (task.status !== 'completed' && status !== 'completed') {
        patch.status = 'completed';
        patch.completed_at = patch.completed_at || new Date().toISOString();
      }
    }

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: restHeaders,
      body: JSON.stringify(patch),
    });
    if (!updateRes.ok) {
      const err = await updateRes.text();
      return { statusCode: updateRes.status, headers, body: JSON.stringify({ error: err }) };
    }
    const updated = await updateRes.json();
    const next = updated[0] || { ...task, ...patch };

    // ---- Room readiness state machine ----
    let roomPatch = null;

    if (status === 'in_progress') {
      roomPatch = { housekeeping_status: 'cleaning_in_progress' };
    } else if (status === 'skipped') {
      roomPatch = { housekeeping_status: 'ready' };
    } else if (status === 'completed' && !inspection_status) {
      roomPatch = { housekeeping_status: 'awaiting_inspection' };
    } else if (inspection_status === 'rejected') {
      roomPatch = { housekeeping_status: 'cleaning_in_progress' };
    } else if (inspection_status === 'approved') {
      roomPatch = { housekeeping_status: 'ready' };
      if (task.is_checkout) {
        roomPatch.occupancy_status = 'vacant';
      }
    } else if (status === 'pending' && task.is_checkout) {
      roomPatch = {
        occupancy_status: 'departure_pending',
        housekeeping_status: 'not_ready',
      };
    }

    if (roomPatch && task.room_id) {
      roomPatch.updated_at = new Date().toISOString();
      await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${task.room_id}`, {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(roomPatch),
      }).catch((e) => console.warn('room patch failed', e.message));
    }

    try {
      await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
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
            is_checkout: task.is_checkout,
            status: next.status,
            inspection_status: next.inspection_status,
            room_patch: roomPatch,
          },
        }),
      });
    } catch (e) {
      console.warn('room_events', e.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, task: next, room_patch: roomPatch }),
    };
  } catch (error) {
    console.error('update-housekeeping-task fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to update housekeeping task' }),
    };
  }
};
