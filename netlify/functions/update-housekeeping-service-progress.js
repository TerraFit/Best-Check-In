// Persist active housekeeping checklist progress without completing the service.
// Auth required (fail closed). business_id is bound from JWT.

const {
  authenticateHousekeepingServiceLive,
  resolveBusinessId,
  schemaMissingResponse,
  MANAGE_HIERARCHY,
} = require('./_housekeepingServiceAuth.cjs');

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
    const gate = await authenticateHousekeepingServiceLive(event, 'execute');
    if (!gate.ok) {
      return { statusCode: gate.status || 401, headers, body: JSON.stringify({ success: false, error: gate.error, code: gate.code }) };
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const {
      businessId: requestedBusinessId,
      sessionId,
      checklistState = {},
      checklistCompletedCount = 0,
      checklistTotalCount = 0,
      issuesReportedCount = 0,
      notes,
    } = body;
    const scope = resolveBusinessId(gate.principal, requestedBusinessId || null);
    if (!scope.ok) {
      return { statusCode: scope.status, headers, body: JSON.stringify({ success: false, error: scope.error }) };
    }
    if (!sessionId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'sessionId is required' }) };
    }

    const businessId = scope.businessId;
    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const q = encodeURIComponent;
    const sessionRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}&status=eq.active&select=id,business_id,employee_id`,
      { headers: read }
    );
    if (!sessionRes.ok) {
      const text = await sessionRes.text();
      const missing = schemaMissingResponse(sessionRes.status, text, 'housekeeping_service_sessions');
      if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) };
      return { statusCode: sessionRes.status, headers, body: JSON.stringify({ success: false, error: text }) };
    }
    const session = (await sessionRes.json())[0];
    if (!session) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Active service session not found' }) };
    }

    const isManagement = gate.principal.actorType === 'business'
      || gate.principal.actorType === 'super_admin'
      || MANAGE_HIERARCHY.has(gate.principal.normalizedRole)
      || gate.principal.permissions?.includes('canManageHousekeeping');
    if (!isManagement && String(session.employee_id || '') !== String(gate.principal.employeeId || '')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: 'Forbidden: service session belongs to another employee' }),
      };
    }

    const patch = {
      checklist_state: checklistState,
      checklist_completed_count: Math.max(0, Number(checklistCompletedCount) || 0),
      checklist_total_count: Math.max(0, Number(checklistTotalCount) || 0),
      issues_reported_count: Math.max(0, Number(issuesReportedCount) || 0),
      ...(notes !== undefined ? { notes } : {}),
      updated_at: new Date().toISOString(),
    };
    const res = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}&status=eq.active`,
      { method: 'PATCH', headers: write, body: JSON.stringify(patch) }
    );
    if (!res.ok) {
      const text = await res.text();
      const missing = schemaMissingResponse(res.status, text, 'housekeeping_service_sessions');
      if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) };
      return { statusCode: res.status, headers, body: JSON.stringify({ success: false, error: text }) };
    }
    const updated = (await res.json())[0];
    if (!updated) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Active service session not found' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, session: updated }) };
  } catch (error) {
    console.error('update-housekeeping-service-progress fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Failed to save service progress' }),
    };
  }
};
