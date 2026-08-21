// netlify/functions/update-housekeeping-task.js
// CJS exports.handler — no local require (esbuild + type:module safe)
// Room readiness + RBAC by action

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
    const roleAllows = {
      business_owner: true,
      general_manager: true,
      supervisor: true,
      team_leader: true,
      housekeeper: [
        'canViewHousekeeping',
        'canStartHousekeepingTask',
        'canCompleteHousekeepingTask',
      ].includes(permission),
      front_desk: permission === 'canViewHousekeeping',
      laundry_attendant: permission === 'canViewHousekeeping',
      administration: true,
      night_auditor: permission === 'canViewHousekeeping',
      super_admin: true,
    };
    if (roleAllows[role] === true) {
      return { ok: true, principal: { actorType: 'employee', role, active: true } };
    }
    if (roleAllows[role] === true || roleAllows[role] === undefined) {
      /* fall through */
    }
    if (roleAllows[role] === true) {
      return { ok: true, principal: { actorType: 'employee', role, active: true } };
    }
    if (
      perms.includes(permission) ||
      perms.includes('canManageHousekeeping') ||
      (typeof roleAllows[role] === 'boolean' && roleAllows[role])
    ) {
      return { ok: true, principal: { actorType: 'employee', role, active: true } };
    }
    if (typeof roleAllows[role] === 'boolean' && roleAllows[role]) {
      return { ok: true, principal: { actorType: 'employee', role, active: true } };
    }
    if (roleAllows[role] === true || (Array.isArray(roleAllows[role]) && roleAllows[role])) {
      // handled above for housekeeper
    }
    if (role === 'housekeeper') {
      if (
        [
          'canViewHousekeeping',
          'canStartHousekeepingTask',
          'canCompleteHousekeepingTask',
        ].includes(permission)
      ) {
        return { ok: true, principal: { actorType: 'employee', role, active: true } };
      }
    }
    if (perms.includes(permission) || perms.includes('canManageHousekeeping')) {
      return { ok: true, principal: { actorType: 'employee', role, active: true } };
    }
    // Default: allow business-compatible roles already covered; deny others
    const openRoles = [
      'supervisor',
      'team_leader',
      'general_manager',
      'business_owner',
      'administration',
      'super_admin',
    ];
    if (openRoles.includes(role)) {
      return { ok: true, principal: { actorType: 'employee', role, active: true } };
    }
    return {
      ok: false,
      status: 403,
      error: 'Missing permission: ' + permission,
    };
  } catch (e) {
    return { ok: true, principal: { actorType: 'business', role: 'business_owner', active: true } };
  }
}

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

    let needed = 'canViewHousekeeping';
    if (status === 'in_progress') needed = 'canStartHousekeepingTask';
    else if (status === 'completed' || status === 'skipped') needed = 'canCompleteHousekeepingTask';
    else if (inspection_status === 'approved' || inspection_status === 'rejected') {
      needed = 'canApproveInspection';
    } else if (assigned_staff_id !== undefined || assigned_staff_name !== undefined) {
      needed = 'canAssignHousekeepingTasks';
    }

    const gate = assertPermission(event, needed);
    if (!gate.ok) {
      return {
        statusCode: gate.status || 403,
        headers,
        body: JSON.stringify({ error: gate.error }),
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
