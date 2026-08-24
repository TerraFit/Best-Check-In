const { authenticateHousekeepingServiceLive, resolveBusinessId, MANAGE_HIERARCHY } = require('./_housekeepingServiceAuth.cjs');

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    const gate = await authenticateHousekeepingServiceLive(event, 'view');
    if (!gate.ok) return { statusCode: gate.status || 401, headers, body: JSON.stringify({ success: false, error: gate.error, code: gate.code }) };
    const requestedBusinessId = event.queryStringParameters?.businessId || null;
    const scope = resolveBusinessId(gate.principal, requestedBusinessId);
    if (!scope.ok) return { statusCode: scope.status, headers, body: JSON.stringify({ success: false, error: scope.error }) };
    const sessionId = event.queryStringParameters?.sessionId || null;
    const status = event.queryStringParameters?.status || null;
    const supabaseUrl = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    const params = new URLSearchParams({ business_id: `eq.${scope.businessId}`, select: '*', order: 'reported_at.asc' });
    if (sessionId) params.set('service_session_id', `eq.${sessionId}`);
    if (status) params.set('status', `eq.${status}`);
    const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_issues?${params.toString()}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ success: false, error: await res.text() }) };
    const issues = await res.json();
    const isManagement = gate.principal.actorType === 'business' || gate.principal.actorType === 'super_admin' || MANAGE_HIERARCHY.has(gate.principal.normalizedRole) || gate.principal.permissions?.includes('canManageHousekeeping');
    const filtered = isManagement || !gate.principal.employeeId ? issues : issues.filter((issue) => String(issue.employee_id || '') === String(gate.principal.employeeId || ''));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, issues: filtered }) };
  } catch (error) {
    console.error('get-housekeeping-issues fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message || 'Failed to load issues' }) };
  }
};
