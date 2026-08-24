// Claim an unassigned housekeeping task for the authenticated employee.
// The claim is intentionally separate from task execution so existing start/progress/complete
// ownership checks remain unchanged.

import auth from './_housekeepingServiceAuth.cjs';

const { authenticateHousekeepingServiceLive, resolveBusinessId } = auth;

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.taskId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'taskId required' }) };

    const gate = await authenticateHousekeepingServiceLive(event, 'execute');
    if (!gate.ok) return { statusCode: gate.status || 403, headers, body: JSON.stringify({ error: gate.error, code: gate.code }) };
    if (gate.principal.actorType !== 'employee' || !gate.principal.employeeId) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only an authenticated employee can claim a task' }) };
    }

    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) return { statusCode: scope.status, headers, body: JSON.stringify({ error: scope.error }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    const baseHeaders = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const writeHeaders = { ...baseHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const taskUrl = `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${encodeURIComponent(body.taskId)}&business_id=eq.${encodeURIComponent(scope.businessId)}&assigned_staff_id=is.null&status=eq.pending`;

    // The conditional PATCH is the concurrency boundary: only an unassigned pending task
    // can be claimed. A second employee receives 409 after the first claim wins.
    const res = await fetch(taskUrl, {
      method: 'PATCH',
      headers: writeHeaders,
      body: JSON.stringify({
        assigned_staff_id: gate.principal.employeeId,
        assigned_staff_name: gate.principal.employeeName || gate.principal.fullName || 'Employee',
        updated_at: new Date().toISOString(),
      }),
    });

    const rows = res.ok ? await res.json() : [];
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: await res.text() }) };
    if (!rows[0]) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Task is no longer available to claim', code: 'TASK_ALREADY_CLAIMED' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, task: rows[0] }) };
  } catch (error) {
    console.error('claim-housekeeping-task fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Failed to claim housekeeping task' }) };
  }
};
