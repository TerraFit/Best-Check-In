// Persist active housekeeping checklist progress without completing the service.

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    const { businessId, sessionId, checklistState = {}, checklistCompletedCount = 0, checklistTotalCount = 0, issuesReportedCount = 0, notes } = JSON.parse(event.body || '{}');
    if (!businessId || !sessionId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId and sessionId are required' }) };

    const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const q = (v) => encodeURIComponent(v);

    const patch = {
      checklist_state: checklistState,
      checklist_completed_count: Math.max(0, Number(checklistCompletedCount) || 0),
      checklist_total_count: Math.max(0, Number(checklistTotalCount) || 0),
      issues_reported_count: Math.max(0, Number(issuesReportedCount) || 0),
      ...(notes !== undefined ? { notes } : {}),
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(sessionId)}&business_id=eq.${q(businessId)}&status=eq.active`, {
      method: 'PATCH', headers: write, body: JSON.stringify(patch),
    });
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: await res.text() }) };
    const session = (await res.json())[0];
    if (!session) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Active service session not found' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, session }) };
  } catch (error) {
    console.error('update-housekeeping-service-progress fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Failed to save service progress' }) };
  }
};
