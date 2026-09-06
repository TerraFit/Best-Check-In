const { authenticateHousekeepingServiceLive, resolveBusinessId, MANAGE_HIERARCHY } = require('./_housekeepingServiceAuth.cjs');

const ISSUE_SELECT = [
  'id',
  'business_id',
  'service_session_id',
  'housekeeping_task_id',
  'room_id',
  'room_number',
  'employee_id',
  'employee_name',
  'checklist_item_id',
  'checklist_item_label',
  'category',
  'issue_type',
  'other_description',
  'description',
  'priority',
  'status',
  'maintenance_requested',
  'maintenance_status',
  'photo_url',
  'reported_at',
  'resolved_at',
  'verified_at',
  'created_at',
  'updated_at',
].join(',');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const response = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method Not Allowed' });

  try {
    const gate = await authenticateHousekeepingServiceLive(event, 'view');
    if (!gate.ok) return response(gate.status || 401, { success: false, error: gate.error, code: gate.code });

    const requestedBusinessId = event.queryStringParameters?.businessId || null;
    const scope = resolveBusinessId(gate.principal, requestedBusinessId);
    if (!scope.ok) return response(scope.status, { success: false, error: scope.error });

    const sessionId = event.queryStringParameters?.sessionId || null;
    const status = event.queryStringParameters?.status || null;
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return response(500, { success: false, error: 'Server configuration error' });

    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const isManagement = gate.principal.actorType === 'business'
      || gate.principal.actorType === 'super_admin'
      || MANAGE_HIERARCHY.has(gate.principal.normalizedRole)
      || gate.principal.permissions?.includes('canManageHousekeeping');

    if (sessionId && !isManagement && gate.principal.employeeId) {
      const sessionRes = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${encodeURIComponent(sessionId)}&business_id=eq.${encodeURIComponent(scope.businessId)}&select=id,employee_id`,
        { headers: read },
      );
      if (!sessionRes.ok) {
        console.error('get-housekeeping-issues session lookup failed:', sessionRes.status);
        return response(503, { success: false, error: 'Unable to verify service session' });
      }
      const session = (await sessionRes.json())[0];
      if (!session || String(session.employee_id || '') !== String(gate.principal.employeeId)) {
        return response(403, { success: false, error: 'Forbidden: service session belongs to another employee' });
      }
    }

    const params = new URLSearchParams({
      business_id: `eq.${scope.businessId}`,
      select: ISSUE_SELECT,
      order: 'reported_at.asc',
    });
    if (sessionId) params.set('service_session_id', `eq.${sessionId}`);
    if (status) params.set('status', `eq.${status}`);

    const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_issues?${params.toString()}`, { headers: read });
    if (!res.ok) {
      console.error('get-housekeeping-issues read failed:', res.status);
      return response(503, { success: false, error: 'Unable to load housekeeping issues' });
    }

    const issues = await res.json();
    const filtered = isManagement || !gate.principal.employeeId
      ? issues
      : issues.filter((issue) => String(issue.employee_id || '') === String(gate.principal.employeeId));

    return response(200, { success: true, issues: filtered });
  } catch (error) {
    console.error('get-housekeeping-issues fatal:', error);
    return response(500, { success: false, error: 'Failed to load housekeeping issues' });
  }
};
