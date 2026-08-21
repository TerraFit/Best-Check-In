// netlify/functions/update-housekeeping-task.js
// CJS exports.handler — no local require (esbuild + type:module safe)
// Room readiness + RBAC + immutable housekeeping service sessions

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
    if (roleAllows[role] === true || perms.includes(permission) || perms.includes('canManageHousekeeping')) {
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

async function supabaseJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
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
      checklist_state,
      issue_count,
    } = body;

    if (!businessId || !taskId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId and taskId required' }) };
    }

    let needed = 'canViewHousekeeping';
    if (status === 'in_progress') needed = 'canStartHousekeepingTask';
    else if (status === 'completed' || status === 'skipped' || checklist_state !== undefined || issue_count !== undefined) {
      needed = 'canCompleteHousekeepingTask';
    } else if (inspection_status === 'approved' || inspection_status === 'rejected') {
      needed = 'canApproveInspection';
    } else if (assigned_staff_id !== undefined || assigned_staff_name !== undefined) {
      needed = 'canAssignHousekeepingTasks';
    }

    const gate = assertPermission(event, needed);
    if (!gate.ok) {
      return { statusCode: gate.status || 403, headers, body: JSON.stringify({ error: gate.error }) };
    }

    const restHeaders = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      Accept: 'application/json',
    };

    const taskLookup = await supabaseJson(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${taskId}&business_id=eq.${businessId}&select=*`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    if (!taskLookup.response.ok) {
      return { statusCode: taskLookup.response.status, headers, body: JSON.stringify({ error: taskLookup.data }) };
    }
    const task = taskLookup.data?.[0];
    if (!task) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Task not found' }) };

    if (status === 'skipped' && (task.task_type !== 'refresh' || task.is_checkout)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Only non-checkout Refresh tasks can be skipped' }),
      };
    }

    const now = new Date().toISOString();
    let serviceSession = null;

    // Start and session creation share the exact same server timestamp.
    if (status === 'in_progress' && task.status !== 'in_progress') {
      const roomLookup = await supabaseJson(
        `${supabaseUrl}/rest/v1/rooms?id=eq.${task.room_id}&business_id=eq.${businessId}&select=id,room_type`,
        { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
      );
      if (!roomLookup.response.ok) {
        return { statusCode: roomLookup.response.status, headers, body: JSON.stringify({ error: roomLookup.data }) };
      }
      const room = roomLookup.data?.[0];

      const settingsLookup = await supabaseJson(
        `${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${businessId}&select=refresh_target_seconds,full_service_target_seconds,warning_threshold_seconds,final_countdown_seconds&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
      );
      if (!settingsLookup.response.ok) {
        return { statusCode: settingsLookup.response.status, headers, body: JSON.stringify({ error: settingsLookup.data }) };
      }
      const settings = settingsLookup.data?.[0] || {};
      const target = task.task_type === 'full_service'
        ? Number(settings.full_service_target_seconds || 3600)
        : Number(settings.refresh_target_seconds || 2700);
      const warning = Number(settings.warning_threshold_seconds ?? 900);
      const finalCountdown = Number(settings.final_countdown_seconds ?? 5);

      const sessionInsert = await supabaseJson(
        `${supabaseUrl}/rest/v1/housekeeping_service_sessions`,
        {
          method: 'POST',
          headers: { ...restHeaders },
          body: JSON.stringify({
            business_id: businessId,
            task_id: taskId,
            room_id: task.room_id,
            room_type: room?.room_type || null,
            service_type: task.task_type,
            target_duration_seconds: target,
            warning_threshold_seconds: warning,
            final_countdown_seconds: finalCountdown,
            started_at: now,
            started_by: completed_by || null,
            checklist_state: {},
            status: 'active',
          }),
        }
      );
      if (!sessionInsert.response.ok) {
        return {
          statusCode: sessionInsert.response.status,
          headers,
          body: JSON.stringify({
            error: 'Unable to create service session. Apply migration 005_housekeeping_service_performance.sql first.',
            details: sessionInsert.data,
          }),
        };
      }
      serviceSession = sessionInsert.data?.[0] || null;
    }

    const patch = { updated_at: now };
    if (status) patch.status = status;
    if (notes !== undefined) patch.notes = notes;
    if (assigned_staff_id !== undefined) patch.assigned_staff_id = assigned_staff_id;
    if (assigned_staff_name !== undefined) patch.assigned_staff_name = assigned_staff_name;
    if (inspection_status !== undefined) patch.inspection_status = inspection_status;

    if (status === 'in_progress') patch.started_at = now;
    if (status === 'completed') {
      patch.completed_at = now;
      if (completed_by) patch.completed_by = completed_by;
      if (!inspection_status) patch.inspection_status = 'pending';
    }
    if (inspection_status === 'approved' || inspection_status === 'rejected') {
      if (task.status !== 'completed' && status !== 'completed') {
        patch.status = 'completed';
        patch.completed_at = patch.completed_at || now;
      }
    }

    const updateRes = await supabaseJson(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${taskId}&business_id=eq.${businessId}`,
      { method: 'PATCH', headers: restHeaders, body: JSON.stringify(patch) }
    );
    if (!updateRes.response.ok) {
      return { statusCode: updateRes.response.status, headers, body: JSON.stringify({ error: updateRes.data }) };
    }
    const updated = updateRes.data;
    const next = updated?.[0] || { ...task, ...patch };

    // Persist checklist progress independently from task scheduling state.
    if (checklist_state !== undefined || issue_count !== undefined) {
      const activeLookup = await supabaseJson(
        `${supabaseUrl}/rest/v1/housekeeping_service_sessions?task_id=eq.${taskId}&business_id=eq.${businessId}&status=eq.active&select=*&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
      );
      if (!activeLookup.response.ok) {
        return { statusCode: activeLookup.response.status, headers, body: JSON.stringify({ error: activeLookup.data }) };
      }
      const active = activeLookup.data?.[0];
      if (active) {
        const sessionPatch = { updated_at: now };
        if (checklist_state !== undefined) sessionPatch.checklist_state = checklist_state;
        if (issue_count !== undefined) sessionPatch.issue_count = Math.max(0, Number(issue_count) || 0);
        const sessionUpdate = await supabaseJson(
          `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${active.id}&business_id=eq.${businessId}`,
          { method: 'PATCH', headers: restHeaders, body: JSON.stringify(sessionPatch) }
        );
        if (!sessionUpdate.response.ok) {
          return { statusCode: sessionUpdate.response.status, headers, body: JSON.stringify({ error: sessionUpdate.data }) };
        }
        serviceSession = sessionUpdate.data?.[0] || { ...active, ...sessionPatch };
      }
    }

    // Completion closes the active session using the server timestamp.
    if (status === 'completed') {
      const activeLookup = await supabaseJson(
        `${supabaseUrl}/rest/v1/housekeeping_service_sessions?task_id=eq.${taskId}&business_id=eq.${businessId}&status=eq.active&select=*&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
      );
      if (activeLookup.response.ok && activeLookup.data?.[0]) {
        const active = activeLookup.data[0];
        const actual = Math.max(0, Math.floor((new Date(now).getTime() - new Date(active.started_at).getTime()) / 1000));
        const sessionPatch = {
          completed_at: now,
          actual_duration_seconds: actual,
          status: 'completed',
          completed_by: completed_by || null,
          updated_at: now,
          ...(checklist_state !== undefined ? { checklist_state } : {}),
          ...(issue_count !== undefined ? { issue_count: Math.max(0, Number(issue_count) || 0) } : {}),
        };
        const sessionUpdate = await supabaseJson(
          `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${active.id}&business_id=eq.${businessId}`,
          { method: 'PATCH', headers: restHeaders, body: JSON.stringify(sessionPatch) }
        );
        if (!sessionUpdate.response.ok) {
          return { statusCode: sessionUpdate.response.status, headers, body: JSON.stringify({ error: sessionUpdate.data }) };
        }
        serviceSession = sessionUpdate.data?.[0] || { ...active, ...sessionPatch };
      }
    }

    let roomPatch = null;
    if (status === 'in_progress') roomPatch = { housekeeping_status: 'cleaning_in_progress' };
    else if (status === 'skipped') roomPatch = { housekeeping_status: 'ready' };
    else if (status === 'completed' && !inspection_status) roomPatch = { housekeeping_status: 'awaiting_inspection' };
    else if (inspection_status === 'rejected') roomPatch = { housekeeping_status: 'cleaning_in_progress' };
    else if (inspection_status === 'approved') {
      roomPatch = { housekeeping_status: 'ready' };
      if (task.is_checkout) roomPatch.occupancy_status = 'vacant';
    } else if (status === 'pending' && task.is_checkout) {
      roomPatch = { occupancy_status: 'departure_pending', housekeeping_status: 'not_ready' };
    }

    if (roomPatch && task.room_id) {
      roomPatch.updated_at = now;
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
            service_session_id: serviceSession?.id || null,
            actual_duration_seconds: serviceSession?.actual_duration_seconds || null,
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
      body: JSON.stringify({
        success: true,
        task: next,
        service_session: serviceSession,
        room_patch: roomPatch,
      }),
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
