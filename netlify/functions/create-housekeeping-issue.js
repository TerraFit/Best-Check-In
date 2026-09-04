const { authenticateHousekeepingServiceLive, resolveBusinessId, schemaMissingResponse, MANAGE_HIERARCHY } = require('./_housekeepingServiceAuth.cjs');

function response(statusCode, headers, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return response(405, headers, { error: 'Method Not Allowed' });

  try {
    const gate = await authenticateHousekeepingServiceLive(event, 'execute');
    if (!gate.ok) return response(gate.status || 401, headers, { success: false, error: gate.error, code: gate.code });

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return response(400, headers, { success: false, error: 'Invalid JSON body' });
    }

    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) return response(scope.status, headers, { success: false, error: scope.error });
    const required = ['sessionId', 'taskId', 'roomId', 'checklistItemId', 'checklistItemLabel', 'category', 'issueType'];
    const missing = required.find((key) => !body[key]);
    if (missing) return response(400, headers, { success: false, error: `${missing} is required` });
    if (body.issueType === 'Other' && !String(body.otherDescription || '').trim()) {
      return response(400, headers, { success: false, error: 'otherDescription is required when issueType is Other' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return response(500, headers, { success: false, error: 'Server configuration error' });
    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const q = encodeURIComponent;

    // The session is authoritative for both the employee and the task/room being serviced.
    // Do not trust client-supplied taskId/roomId to attach an issue to another resource.
    const sessionRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(body.sessionId)}&business_id=eq.${q(scope.businessId)}&select=id,employee_id,housekeeping_task_id,room_id,status`,
      { headers: read }
    );
    if (!sessionRes.ok) {
      const text = await sessionRes.text();
      const missingSchema = schemaMissingResponse(sessionRes.status, text, 'housekeeping_service_sessions');
      if (missingSchema) return response(503, headers, missingSchema);
      console.error('create-housekeeping-issue session lookup failed:', sessionRes.status);
      return response(500, headers, { success: false, error: 'Failed to load service session' });
    }

    const session = (await sessionRes.json())[0];
    if (!session) return response(404, headers, { success: false, error: 'Service session not found' });
    if (session.status !== 'active') return response(409, headers, { success: false, error: 'Service session is not active' });

    const principal = gate.principal;
    const isManagement = principal.actorType === 'business'
      || principal.actorType === 'super_admin'
      || MANAGE_HIERARCHY.has(principal.normalizedRole)
      || principal.permissions?.includes('canManageHousekeeping');
    if (!isManagement && String(session.employee_id || '') !== String(principal.employeeId || '')) {
      return response(403, headers, { success: false, error: 'Forbidden: service session belongs to another employee' });
    }

    if (String(session.housekeeping_task_id || '') !== String(body.taskId || '')) {
      return response(403, headers, { success: false, error: 'Forbidden: task does not belong to service session' });
    }
    if (String(session.room_id || '') !== String(body.roomId || '')) {
      return response(403, headers, { success: false, error: 'Forbidden: room does not belong to service session' });
    }

    const taskRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(session.housekeeping_task_id)}&business_id=eq.${q(scope.businessId)}&select=id,room_id,room_number`,
      { headers: read }
    );
    if (!taskRes.ok) {
      const text = await taskRes.text();
      console.error('create-housekeeping-issue task lookup failed:', taskRes.status);
      return response(500, headers, { success: false, error: 'Failed to load housekeeping task' });
    }
    const task = (await taskRes.json())[0];
    if (!task) return response(404, headers, { success: false, error: 'Housekeeping task not found' });
    if (String(task.room_id || '') !== String(session.room_id || '')) {
      return response(403, headers, { success: false, error: 'Forbidden: service session room mismatch' });
    }

    const payload = {
      business_id: scope.businessId,
      service_session_id: session.id,
      housekeeping_task_id: session.housekeeping_task_id,
      room_id: session.room_id,
      room_number: body.roomNumber || task.room_number || null,
      employee_id: principal.employeeId || null,
      employee_name: principal.employeeName || null,
      checklist_item_id: body.checklistItemId,
      checklist_item_label: body.checklistItemLabel,
      category: body.category,
      issue_type: body.issueType,
      other_description: body.otherDescription || null,
      description: body.description || null,
      priority: new Set(['low', 'medium', 'high', 'urgent']).has(body.priority) ? body.priority : 'medium',
      maintenance_requested: Boolean(body.maintenanceRequested),
      maintenance_status: body.maintenanceRequested ? 'pending' : null,
      photo_url: body.photoUrl || null,
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_issues`, {
      method: 'POST',
      headers: write,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      const missingSchema = schemaMissingResponse(res.status, text, 'housekeeping_issues');
      if (missingSchema) return response(503, headers, missingSchema);
      console.error('create-housekeeping-issue insert failed:', res.status);
      return response(500, headers, { success: false, error: 'Failed to report housekeeping issue' });
    }
    const issue = (await res.json())[0];
    return response(201, headers, { success: true, issue });
  } catch (error) {
    console.error('create-housekeeping-issue fatal:', error?.message || error);
    return response(500, headers, { success: false, error: 'Failed to report housekeeping issue' });
  }
};
