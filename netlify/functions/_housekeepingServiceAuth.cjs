// Housekeeping authorization compatibility layer.
// JWT verification and application identity are owned exclusively by _auth.cjs.
const { authenticateRequest, resolveTenant } = require('./_auth.cjs');

const ROLE_ALIASES = {
  'employee (legacy)': 'Employee (Legacy)', employeeoverview: 'Employee (Legacy)', employee: 'Employee (Legacy)',
  'team leader': 'Team Leader', team_leader: 'Team Leader', lead: 'Team Leader',
  supervisor: 'Supervisor', foreman: 'Foreman', manager: 'Manager', director: 'Director',
  housekeeper: 'Employee (Legacy)', front_desk: 'Employee (Legacy)', laundry_attendant: 'Employee (Legacy)',
  night_auditor: 'Employee (Legacy)', security: 'Employee (Legacy)', marketing: 'Employee (Legacy)',
  finance: 'Employee (Legacy)', receptionist: 'Employee (Legacy)', reception: 'Employee (Legacy)',
  custom: 'Employee (Legacy)', maintenance: 'Foreman', administration: 'Manager',
  general_manager: 'Manager', business: 'business_owner', business_owner: 'business_owner', super_admin: 'super_admin',
};
const EXECUTE_HIERARCHY = new Set(['Employee (Legacy)', 'Team Leader', 'Supervisor', 'Foreman', 'Manager', 'Director']);
const MANAGE_HIERARCHY = new Set(['Team Leader', 'Supervisor', 'Foreman', 'Manager', 'Director']);
const ASSIGN_HIERARCHY = new Set(['Team Leader', 'Supervisor', 'Foreman', 'Manager', 'Director']);
const GENERATE_HIERARCHY = new Set(['Supervisor', 'Foreman', 'Manager', 'Director']);
const NON_HOUSEKEEPING_LEGACY_ROLES = new Set([
  'employee', 'employeeoverview', 'front_desk', 'receptionist', 'reception',
  'laundry_attendant', 'maintenance', 'administration', 'marketing', 'finance',
  'night_auditor', 'security', 'custom',
]);

function normalizeRole(raw) {
  if (raw == null || raw === '') return 'Employee (Legacy)';
  const s = String(raw).trim();
  if (ROLE_ALIASES[s]) return ROLE_ALIASES[s];
  const lower = s.toLowerCase();
  if (ROLE_ALIASES[lower]) return ROLE_ALIASES[lower];
  if (EXECUTE_HIERARCHY.has(s) || s === 'business_owner' || s === 'super_admin') return s;
  return s;
}

function asPermArray(permissionSet) {
  if (Array.isArray(permissionSet)) return permissionSet.filter((p) => typeof p === 'string');
  if (typeof permissionSet === 'string') {
    try {
      const p = JSON.parse(permissionSet);
      return Array.isArray(p) ? p.filter((value) => typeof value === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapPrincipal(principal) {
  if (!principal) return null;
  if (principal.actorType === 'super_admin') {
    return { ...principal, normalizedRole: 'super_admin', permissions: asPermArray(principal.permissions) };
  }
  if (!['business', 'employee'].includes(principal.actorType)) return null;
  return {
    ...principal,
    normalizedRole: principal.actorType === 'business' ? 'business_owner' : normalizeRole(principal.role),
    permissions: asPermArray(principal.permissions),
  };
}

function authenticateHousekeepingService(event, mode = 'manage') {
  // Canonical auth rejects service-role JWTs and mutable metadata impersonation.
  const authenticated = authenticateRequest(event);
  if (!authenticated.ok) return authenticated;

  const principal = mapPrincipal(authenticated.principal);
  if (!principal) return { ok: false, status: 403, error: 'Business account access required' };
  const has = (permission) => principal.permissions.includes(permission);

  if (mode === 'manage') {
    if (principal.actorType === 'business' || principal.actorType === 'super_admin') return { ok: true, principal };
    if (MANAGE_HIERARCHY.has(principal.normalizedRole) || has('canManageSettings') || has('canManageHousekeeping')) return { ok: true, principal };
    return { ok: false, status: 403, error: 'Missing permission: canManageSettings' };
  }
  if (mode === 'assign') {
    if (principal.actorType === 'business' || principal.actorType === 'super_admin') return { ok: true, principal };
    if (ASSIGN_HIERARCHY.has(principal.normalizedRole) || has('canAssignHousekeepingTasks') || has('canManageHousekeeping')) return { ok: true, principal };
    return { ok: false, status: 403, error: 'Missing permission: canAssignHousekeepingTasks' };
  }
  if (mode === 'generate') {
    if (principal.actorType === 'business' || principal.actorType === 'super_admin') return { ok: true, principal };
    if (GENERATE_HIERARCHY.has(principal.normalizedRole) || has('canGenerateHousekeepingSchedule') || has('canManageHousekeeping')) return { ok: true, principal };
    return { ok: false, status: 403, error: 'Missing permission: canGenerateHousekeepingSchedule' };
  }
  if (mode === 'view_performance') {
    if (principal.actorType === 'business' || principal.actorType === 'super_admin' || MANAGE_HIERARCHY.has(principal.normalizedRole) || has('canManageHousekeeping') || has('canViewHousekeepingPerformance') || has('canViewHousekeepingReports')) return { ok: true, principal };
    return { ok: false, status: 403, error: 'Missing permission: canViewHousekeepingPerformance' };
  }
  if (mode === 'view') {
    if (principal.actorType === 'business' || principal.actorType === 'super_admin') return { ok: true, principal };
    if (EXECUTE_HIERARCHY.has(principal.normalizedRole) || has('canViewHousekeeping') || has('canManageHousekeeping') || has('canStartHousekeepingTask') || has('canCompleteHousekeepingTask')) return { ok: true, principal };
    return { ok: false, status: 403, error: 'Missing permission: canViewHousekeeping' };
  }

  const legacyRoleWithoutExplicitHousekeepingAccess = NON_HOUSEKEEPING_LEGACY_ROLES.has(principal.role);
  if (legacyRoleWithoutExplicitHousekeepingAccess && !has('canStartHousekeepingTask') && !has('canCompleteHousekeepingTask') && !has('canManageHousekeeping')) return { ok: false, status: 403, error: 'Missing permission: canStartHousekeepingTask' };
  if (principal.actorType === 'business' || principal.actorType === 'super_admin' || EXECUTE_HIERARCHY.has(principal.normalizedRole) || has('canStartHousekeepingTask') || has('canCompleteHousekeepingTask') || has('canManageHousekeeping')) return { ok: true, principal };
  return { ok: false, status: 403, error: 'Missing permission: canStartHousekeepingTask' };
}

async function assertEmployeeStillActive(principal) {
  if (!principal || principal.actorType !== 'employee' || !principal.employeeId) return { ok: true, principal };
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !key) return { ok: false, status: 500, error: 'Server configuration error' };
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(principal.employeeId)}&select=id,business_id,status`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, status: 503, error: 'Unable to verify employee status' };
    const row = (await res.json())[0];
    if (!row) return { ok: false, status: 403, error: 'Employee account not found' };
    if (String(row.status || '').toLowerCase() === 'disabled') return { ok: false, status: 403, error: 'Account has been disabled. Please contact your administrator.', code: 'EMPLOYEE_DISABLED' };
    if (String(row.business_id) !== String(principal.businessId)) return { ok: false, status: 403, error: 'Forbidden: business scope mismatch' };
    return { ok: true, principal: { ...principal, active: true, status: row.status || 'Active' } };
  } catch (err) {
    console.error('assertEmployeeStillActive failed:', err?.message || err);
    return { ok: false, status: 503, error: 'Unable to verify employee status' };
  }
}

async function authenticateHousekeepingServiceLive(event, mode = 'execute') {
  const gate = authenticateHousekeepingService(event, mode);
  if (!gate.ok) return gate;
  return assertEmployeeStillActive(gate.principal);
}

function resolveBusinessId(principal, clientBusinessId) {
  return resolveTenant(principal, clientBusinessId || undefined);
}

function isSchemaMissingError(status, bodyText) {
  const text = typeof bodyText === 'string' ? bodyText : JSON.stringify(bodyText || '');
  return /PGRST205|relation .* does not exist|Could not find the table|schema cache/i.test(text);
}
function schemaMissingResponse(status, bodyText, relation) {
  if (!isSchemaMissingError(status, bodyText)) return null;
  return { success: false, error: 'Housekeeping service schema is not installed', code: 'HOUSEKEEPING_SCHEMA_MISSING', relation: relation || undefined, hint: 'Apply docs/migrations/013, 014 and 015' };
}
function phoneDigitVariants(phone) {
  const cleanDigits = String(phone || '').replace(/\D/g, '');
  if (!cleanDigits) return [];
  const variants = new Set([cleanDigits]);
  if (cleanDigits.startsWith('0')) variants.add(cleanDigits.substring(1));
  if (!cleanDigits.startsWith('0')) variants.add('0' + cleanDigits);
  if (cleanDigits.startsWith('27')) {
    const w = cleanDigits.substring(2);
    variants.add(w);
    if (!w.startsWith('0')) variants.add('0' + w);
  }
  if (!cleanDigits.startsWith('27')) {
    if (cleanDigits.length === 9) variants.add('27' + cleanDigits);
    else if (cleanDigits.length === 10 && cleanDigits.startsWith('0')) variants.add('27' + cleanDigits.substring(1));
  }
  return [...variants].filter(Boolean);
}
module.exports = { authenticateHousekeepingService, authenticateHousekeepingServiceLive, assertEmployeeStillActive, resolveBusinessId, isSchemaMissingError, schemaMissingResponse, normalizeRole, phoneDigitVariants, ROLE_ALIASES, EXECUTE_HIERARCHY, MANAGE_HIERARCHY, ASSIGN_HIERARCHY, GENERATE_HIERARCHY };
