// Start a measured housekeeping service session.
// Elapsed time is derived from the persisted server timestamp, not browser ticks.
// Auth required (fail closed). business_id is bound from JWT.

const {
  authenticateHousekeepingServiceLive,
  resolveBusinessId,
  schemaMissingResponse,
  MANAGE_HIERARCHY,
} = require('./_housekeepingServiceAuth.cjs');

const DEFAULT_TARGETS = { refresh: 45, full_service: 60, deep_cleaning: 120, mattress_flip_air: 30, checkout_inspection: 10 };

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    const gate = await authenticateHousekeepingServiceLive(event, 'execute');
    if (!gate.ok) return { statusCode: gate.status || 401, headers, body: JSON.stringify({ success: false, error: gate.error, code: gate.code }) };
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    const body = JSON.parse(event.body || '{}');
    const { taskId, serviceType } = body;
    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) return { statusCode: scope.status, headers, body: JSON.stringify({ success: false, error: scope.error }) };
    const businessId = scope.businessId;
    if (!taskId || !serviceType) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'taskId and serviceType are required' }) };
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_TARGETS, serviceType)) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Unsupported service type' }) };
    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const q = (v) => encodeURIComponent(v);
    const taskRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(taskId)}&business_id=eq.${q(businessId)}&select=*`, { headers: read });
    if (!taskRes.ok) return { statusCode: taskRes.status, headers, body: JSON.stringify({ success: false, error: await taskRes.text() }) };
    const task = (await taskRes.json())[0];
    if (!task) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Housekeeping task not found' }) };
    if (task.status !== 'pending') return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: `Task is already ${task.status}`, task }) };

    const isManagement = gate.principal.actorType === 'business' || gate.principal.actorType === 'super_admin' || MANAGE_HIERARCHY.has(gate.principal.normalizedRole) || gate.principal.permissions?.includes('canManageHousekeeping');
    const assignedEmployeeId = String(task.assigned_staff_id || '');
    const currentEmployeeId = String(gate.principal.employeeId || '');
    // Task Assignments is optional: an unassigned task is intentionally available to any
    // authenticated employee with housekeeping execution permission. Once a task has an
    // explicit assignment, only that employee (or management) may start it.
    if (!isManagement && assignedEmployeeId && assignedEmployeeId !== currentEmployeeId) {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Forbidden: housekeeping task is assigned to another employee' }) };
    }

    const roomRes = await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${q(task.room_id)}&business_id=eq.${q(businessId)}&select=id,room_type,room_name,room_number`, { headers: read });
    if (!roomRes.ok) return { statusCode: roomRes.status, headers, body: JSON.stringify({ success: false, error: await roomRes.text() }) };
    const room = (await roomRes.json())[0];
    if (!room) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Room not found' }) };
    let settings = null;
    const settingsRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_settings?business_id=eq.${q(businessId)}&select=*&limit=1`, { headers: read });
    if (settingsRes.ok) settings = (await settingsRes.json())[0] || null;
    const targetsRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_targets?business_id=eq.${q(businessId)}&service_type=eq.${q(serviceType)}&active=eq.true&select=*`, { headers: read });
    const targets = targetsRes.ok ? await targetsRes.json() : [];
    const roomType = String(room.room_type || '').trim().toLowerCase();
    const override = targets.find((target) => String(target.room_type || '').trim().toLowerCase() === roomType);
    const serviceDefault = targets.find((target) => !target.room_type);
    const targetMinutes = Number(override?.target_minutes || serviceDefault?.target_minutes || DEFAULT_TARGETS[serviceType]);
    const warningMinutes = Number(settings?.warning_minutes ?? 15);
    const startedAt = new Date().toISOString();
    const sessionRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions`, { method: 'POST', headers: write, body: JSON.stringify({ business_id: businessId, housekeeping_task_id: task.id, room_id: room.id, booking_id: task.booking_id || null, employee_id: gate.principal.employeeId, employee_name: gate.principal.employeeName || task.assigned_staff_name || null, service_type: serviceType, room_type_snapshot: room.room_type || null, target_minutes_snapshot: targetMinutes, warning_minutes_snapshot: warningMinutes, started_at: startedAt, status: 'active', checklist_completed_count: 0, checklist_total_count: 0, issues_reported_count: 0, quality_result: 'pending', checklist_state: {} }) });
    if (!sessionRes.ok) { const text = await sessionRes.text(); const missing = schemaMissingResponse(sessionRes.status, text, 'housekeeping_service_sessions'); if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) }; return { statusCode: sessionRes.status, headers, body: JSON.stringify({ success: false, error: text }) }; }
    const session = (await sessionRes.json())[0];
    const taskRes2 = await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(task.id)}&business_id=eq.${q(businessId)}`, { method: 'PATCH', headers: write, body: JSON.stringify({ status: 'in_progress', started_at: startedAt, updated_at: startedAt }) });
    if (!taskRes2.ok) { await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(session.id)}`, { method: 'PATCH', headers: write, body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() }) }); return { statusCode: taskRes2.status, headers, body: JSON.stringify({ success: false, error: await taskRes2.text() }) }; }
    await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${q(room.id)}&business_id=eq.${q(businessId)}`, { method: 'PATCH', headers: { ...write, Prefer: 'return=minimal' }, body: JSON.stringify({ housekeeping_status: 'cleaning_in_progress', updated_at: startedAt }) });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, session, timer: { startedAt, targetMinutes, warningMinutes, finalCountdownSeconds: Number(settings?.final_countdown_seconds ?? 5), voiceEnabled: settings?.voice_enabled ?? true, soundEnabled: settings?.sound_enabled ?? true } }) };
  } catch (error) {
    console.error('start-housekeeping-service fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message || 'Failed to start housekeeping service' }) };
  }
};