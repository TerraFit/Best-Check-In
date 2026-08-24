// Complete a measured housekeeping service session.
// Actual duration is calculated from persisted timestamps, never from the client timer.
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
    const q = (v) => encodeURIComponent(v);
    const sessionRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}&select=*`,
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
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Service session not found' }) };
    }
    if (session.status !== 'active') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ success: false, error: `Service session is already ${session.status}`, session }),
      };
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

    const completedAt = new Date().toISOString();
    const actualSeconds = Math.max(
      0,
      Math.floor((new Date(completedAt).getTime() - new Date(session.started_at).getTime()) / 1000)
    );
    const targetSeconds = Number(session.target_minutes_snapshot) * 60;
    const sessionPatch = {
      completed_at: completedAt,
      actual_seconds: actualSeconds,
      status: 'completed',
      checklist_completed_count: Math.max(0, Number(checklistCompletedCount) || 0),
      checklist_total_count: Math.max(0, Number(checklistTotalCount) || 0),
      issues_reported_count: Math.max(0, Number(issuesReportedCount) || 0),
      quality_result: 'pending',
      notes: notes ?? session.notes ?? null,
      updated_at: completedAt,
    };
    const updateSessionRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}&status=eq.active`,
      { method: 'PATCH', headers: write, body: JSON.stringify(sessionPatch) }
    );
    if (!updateSessionRes.ok) {
      const text = await updateSessionRes.text();
      const missing = schemaMissingResponse(updateSessionRes.status, text, 'housekeeping_service_sessions');
      if (missing) return { statusCode: 503, headers, body: JSON.stringify(missing) };
      return { statusCode: updateSessionRes.status, headers, body: JSON.stringify({ success: false, error: text }) };
    }

    const taskRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${q(session.housekeeping_task_id)}&business_id=eq.${q(businessId)}`,
      {
        method: 'PATCH',
        headers: write,
        body: JSON.stringify({
          status: 'completed',
          completed_at: completedAt,
          inspection_status: 'pending',
          updated_at: completedAt,
        }),
      }
    );
    if (!taskRes.ok) {
      return { statusCode: taskRes.status, headers, body: JSON.stringify({ success: false, error: await taskRes.text() }) };
    }
    await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${q(session.room_id)}&business_id=eq.${q(businessId)}`, {
      method: 'PATCH',
      headers: { ...write, Prefer: 'return=minimal' },
      body: JSON.stringify({ housekeeping_status: 'awaiting_inspection', updated_at: completedAt }),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session: { ...session, ...sessionPatch },
        performance: {
          actualSeconds,
          targetSeconds,
          varianceSeconds: actualSeconds - targetSeconds,
          overTarget: actualSeconds > targetSeconds,
        },
      }),
    };
  } catch (error) {
    console.error('complete-housekeeping-service fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Failed to complete housekeeping service' }),
    };
  }
};
