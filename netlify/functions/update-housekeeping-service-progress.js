import auth from './_auth.cjs';
import rbac from './_rbac.cjs';

const { requireBusinessActor, resolveTenant } = auth;
const MANAGEMENT_ROLES = new Set(['general_manager', 'manager', 'director', 'supervisor', 'team_leader', 'foreman']);

function response(statusCode, headers, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

function isManagement(principal) {
  if (!principal || principal.actorType === 'business') return true;
  const role = String(principal.role || '').trim().toLowerCase();
  const permissions = rbac.resolvePermissions(principal);
  return MANAGEMENT_ROLES.has(role)
    || permissions.has('canManageHousekeeping')
    || permissions.has('canAssignHousekeepingTasks');
}

function hasProgressPermission(principal) {
  if (!principal) return false;
  if (principal.actorType === 'business') return true;
  return rbac.requirePermission(principal, 'canStartHousekeepingTask')
    || rbac.requirePermission(principal, 'canCompleteHousekeepingTask');
}

function hasExplicitProgressPermission(principal) {
  return !!principal
    && principal.actorType === 'employee'
    && Array.isArray(principal.permissions)
    && (principal.permissions.includes('canStartHousekeepingTask')
      || principal.permissions.includes('canCompleteHousekeepingTask'));
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return response(405, headers, { error: 'Method Not Allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, headers, { success: false, error: 'Invalid JSON body' });
  }

  const gate = requireBusinessActor(event);
  if (!gate.ok) return response(gate.status || 401, headers, { success: false, error: gate.error });

  const principal = gate.principal;
  const scope = resolveTenant(principal, body.businessId || null);
  if (!scope.ok) return response(scope.status, headers, { success: false, error: scope.error });

  if (!body.sessionId) return response(400, headers, { success: false, error: 'sessionId is required' });
  if (!hasProgressPermission(principal)) {
    return response(403, headers, { success: false, error: 'Missing permission: canStartHousekeepingTask' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !key) return response(500, headers, { success: false, error: 'Server configuration error' });

  const businessId = scope.businessId;
  const read = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
  const write = { ...read, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const q = encodeURIComponent;

  try {
    if (principal.actorType === 'employee') {
      const employeeRes = await fetch(
        `${supabaseUrl}/rest/v1/employees?id=eq.${q(principal.employeeId)}&business_id=eq.${q(businessId)}&select=id,business_id,status`,
        { headers: read }
      );
      if (!employeeRes.ok) {
        console.error('update-housekeeping-service-progress employee verification failed:', employeeRes.status);
        return response(503, headers, { success: false, error: 'Unable to verify employee status' });
      }
      const employee = (await employeeRes.json())[0];
      if (!employee) return response(403, headers, { success: false, error: 'Employee account not found' });
      if (String(employee.status || '').toLowerCase() === 'disabled') {
        return response(403, headers, { success: false, error: 'Account has been disabled. Please contact your administrator.', code: 'EMPLOYEE_DISABLED' });
      }
      if (String(employee.business_id) !== String(principal.businessId)) {
        return response(403, headers, { success: false, error: 'Forbidden: business scope mismatch' });
      }
    }

    const sessionRes = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(body.sessionId)}&business_id=eq.${q(businessId)}&status=eq.active&select=id,business_id,employee_id`,
      { headers: read }
    );
    if (!sessionRes.ok) {
      const text = await sessionRes.text();
      if (/PGRST205|relation .* does not exist|Could not find the table|schema cache/i.test(text)) {
        return response(503, headers, { success: false, error: 'Housekeeping service schema is not installed', code: 'HOUSEKEEPING_SCHEMA_MISSING', relation: 'housekeeping_service_sessions', hint: 'Apply docs/migrations/013, 014 and 015' });
      }
      console.error('update-housekeeping-service-progress session lookup failed:', sessionRes.status);
      return response(500, headers, { success: false, error: 'Failed to load service session' });
    }
    const session = (await sessionRes.json())[0];
    if (!session) return response(404, headers, { success: false, error: 'Active service session not found' });

    const management = isManagement(principal);
    const explicitProgressPermission = hasExplicitProgressPermission(principal);
    if (!management && !explicitProgressPermission && String(session.employee_id || '') !== String(principal.employeeId || '')) {
      return response(403, headers, { success: false, error: 'Forbidden: service session belongs to another employee' });
    }

    const completed = Math.max(0, Number(body.checklistCompletedCount) || 0);
    const total = Math.max(0, Number(body.checklistTotalCount) || 0);
    const issues = Math.max(0, Number(body.issuesReportedCount) || 0);
    const patch = {
      checklist_state: body.checklistState && typeof body.checklistState === 'object' ? body.checklistState : {},
      checklist_completed_count: completed,
      checklist_total_count: total,
      issues_reported_count: issues,
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_service_sessions?id=eq.${q(body.sessionId)}&business_id=eq.${q(businessId)}&status=eq.active`,
      { method: 'PATCH', headers: write, body: JSON.stringify(patch) }
    );
    if (!res.ok) {
      const text = await res.text();
      if (/PGRST205|relation .* does not exist|Could not find the table|schema cache/i.test(text)) {
        return response(503, headers, { success: false, error: 'Housekeeping service schema is not installed', code: 'HOUSEKEEPING_SCHEMA_MISSING', relation: 'housekeeping_service_sessions', hint: 'Apply docs/migrations/013, 014 and 015' });
      }
      console.error('update-housekeeping-service-progress session update failed:', res.status);
      return response(500, headers, { success: false, error: 'Failed to save service progress' });
    }
    const updated = (await res.json())[0];
    if (!updated) return response(404, headers, { success: false, error: 'Active service session not found' });
    return response(200, headers, { success: true, session: updated });
  } catch (error) {
    console.error('update-housekeeping-service-progress fatal:', error?.message || error);
    return response(500, headers, { success: false, error: 'Failed to save service progress' });
  }
};
