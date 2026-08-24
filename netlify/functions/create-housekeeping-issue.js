const { authenticateHousekeepingServiceLive, resolveBusinessId, schemaMissingResponse, MANAGE_HIERARCHY } = require('./_housekeepingServiceAuth.cjs');

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    const gate = await authenticateHousekeepingServiceLive(event, 'execute');
    if (!gate.ok) return { statusCode: gate.status || 401, headers, body: JSON.stringify({ success: false, error: gate.error, code: gate.code }) };
    const body = JSON.parse(event.body || '{}');
    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) return { statusCode: scope.status, headers, body: JSON.stringify({ success: false, error: scope.error }) };
    const required = ['sessionId','taskId','roomId','checklistItemId','checklistItemLabel','category','issueType'];
    const missing = required.find((key) => !body[key]);
    if (missing) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `${missing} is required` }) };
    if (body.issueType === 'Other' && !String(body.otherDescription || '').trim()) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'otherDescription is required when issueType is Other' }) };
    const allowedPriority = new Set(['low','medium','high','urgent']);
    const priority = allowedPriority.has(body.priority) ? body.priority : 'medium';
    const supabaseUrl = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const q = encodeURIComponent;
    const sessionRes = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(body.sessionId)}&business_id=eq.${q(scope.businessId)}&select=id,employee_id`, { headers: read });
    if (!sessionRes.ok) { const text = await sessionRes.text(); const missingSchema = schemaMissingResponse(sessionRes.status, text, 'housekeeping_service_sessions'); if (missingSchema) return { statusCode: 503, headers, body: JSON.stringify(missingSchema) }; return { statusCode: sessionRes.status, headers, body: JSON.stringify({ success: false, error: text }) }; }
    const session = (await sessionRes.json())[0];
    if (!session) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Service session not found' }) };
    const isManagement = gate.principal.actorType === 'business' || gate.principal.actorType === 'super_admin' || MANAGE_HIERARCHY.has(gate.principal.normalizedRole) || gate.principal.permissions?.includes('canManageHousekeeping');
    if (!isManagement && String(session.employee_id || '') !== String(gate.principal.employeeId || '')) return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Forbidden: service session belongs to another employee' }) };
    const payload = {
      business_id: scope.businessId,
      service_session_id: body.sessionId,
      housekeeping_task_id: body.taskId,
      room_id: body.roomId,
      room_number: body.roomNumber || null,
      employee_id: gate.principal.employeeId || null,
      employee_name: gate.principal.employeeName || null,
      checklist_item_id: body.checklistItemId,
      checklist_item_label: body.checklistItemLabel,
      category: body.category,
      issue_type: body.issueType,
      other_description: body.otherDescription || null,
      description: body.description || null,
      priority,
      maintenance_requested: Boolean(body.maintenanceRequested),
      maintenance_status: body.maintenanceRequested ? 'pending' : null,
      photo_url: body.photoUrl || null,
    };
    const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_issues`, { method: 'POST', headers: write, body: JSON.stringify(payload) });
    if (!res.ok) { const text = await res.text(); const missingSchema = schemaMissingResponse(res.status, text, 'housekeeping_issues'); if (missingSchema) return { statusCode: 503, headers, body: JSON.stringify(missingSchema) }; return { statusCode: res.status, headers, body: JSON.stringify({ success: false, error: text }) }; }
    const issue = (await res.json())[0];
    return { statusCode: 201, headers, body: JSON.stringify({ success: true, issue }) };
  } catch (error) {
    console.error('create-housekeeping-issue fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message || 'Failed to report issue' }) };
  }
};
