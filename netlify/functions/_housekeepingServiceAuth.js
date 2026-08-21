// Shared JWT auth and Supabase schema diagnostics for housekeeping service performance.
// Business owner rule: business_id present + no employee_id => management owner.
// Non-super-admin businessId is always taken from the token (never from client override).

const jwt = require('jsonwebtoken');

const MANAGE_ROLES = new Set([
  'business',
  'business_owner',
  'general_manager',
  'supervisor',
  'team_leader',
  'administration',
  'super_admin',
]);

const EXECUTE_ROLES = new Set([
  'business',
  'business_owner',
  'general_manager',
  'supervisor',
  'team_leader',
  'housekeeper',
  'administration',
  'super_admin',
]);

function extractToken(event) {
  const raw = (event.headers?.authorization || event.headers?.Authorization || '').trim();
  if (!raw) return null;
  const token = raw.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

function authenticateHousekeepingService(event, mode = 'manage') {
  const token = extractToken(event);
  if (!token) return { ok: false, status: 401, error: 'No authorization token provided' };

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return { ok: false, status: 401, error: 'Token has expired' };
    }
    return { ok: false, status: 401, error: 'Invalid authorization token' };
  }

  const meta = decoded?.user_metadata || {};
  if (decoded?.role === 'service_role' || meta.super_admin) {
    return {
      ok: true,
      principal: {
        actorType: 'super_admin',
        role: 'super_admin',
        businessId: meta.business_id || null,
        employeeId: null,
        employeeName: null,
      },
    };
  }

  const businessId = meta.business_id;
  if (!businessId) {
    return { ok: false, status: 403, error: 'Token missing business ID' };
  }

  // Business-owner JWTs: no employee_id. Always full management for their own business.
  if (!meta.employee_id) {
    return {
      ok: true,
      principal: {
        actorType: 'business',
        role: 'business_owner',
        businessId,
        employeeId: null,
        employeeName: meta.business_name || meta.email || null,
      },
    };
  }

  const role = String(meta.staff_role || meta.role || '').toLowerCase();
  const perms = Array.isArray(meta.permission_set) ? meta.permission_set : [];
  const principal = {
    actorType: 'employee',
    role,
    businessId,
    employeeId: meta.employee_id || decoded.sub || null,
    employeeName: meta.full_name || meta.name || null,
  };

  if (mode === 'manage') {
    if (
      MANAGE_ROLES.has(role) ||
      perms.includes('canManageSettings') ||
      perms.includes('canManageHousekeeping')
    ) {
      return { ok: true, principal };
    }
    return { ok: false, status: 403, error: 'Missing permission: canManageSettings' };
  }

  if (mode === 'view_performance') {
    if (
      MANAGE_ROLES.has(role) ||
      perms.includes('canManageHousekeeping') ||
      perms.includes('canViewHousekeepingPerformance') ||
      perms.includes('canViewHousekeepingReports')
    ) {
      return { ok: true, principal };
    }
    return { ok: false, status: 403, error: 'Missing permission: canViewHousekeepingPerformance' };
  }

  // execute: start / progress / complete
  if (
    EXECUTE_ROLES.has(role) ||
    perms.includes('canStartHousekeepingTask') ||
    perms.includes('canCompleteHousekeepingTask') ||
    perms.includes('canManageHousekeeping')
  ) {
    return { ok: true, principal };
  }
  return { ok: false, status: 403, error: 'Missing permission: canStartHousekeepingTask' };
}

function resolveBusinessId(principal, clientBusinessId) {
  if (principal.actorType === 'super_admin') {
    const id = clientBusinessId || principal.businessId;
    if (!id) return { ok: false, status: 400, error: 'businessId required' };
    return { ok: true, businessId: id };
  }
  if (clientBusinessId && clientBusinessId !== principal.businessId) {
    return { ok: false, status: 403, error: 'Forbidden: business scope mismatch' };
  }
  return { ok: true, businessId: principal.businessId };
}

function isSchemaMissingError(status, bodyText) {
  const text = typeof bodyText === 'string' ? bodyText : JSON.stringify(bodyText || '');
  if (status === 404 || status === 400) {
    return /PGRST205|relation .* does not exist|Could not find the table|schema cache/i.test(text);
  }
  return /PGRST205|relation .* does not exist|Could not find the table|schema cache/i.test(text);
}

function schemaMissingResponse(status, bodyText, relation) {
  if (!isSchemaMissingError(status, bodyText)) return null;
  return {
    success: false,
    error: 'Housekeeping service schema is not installed',
    code: 'HOUSEKEEPING_SCHEMA_MISSING',
    relation: relation || undefined,
    hint: 'Apply docs/migrations/013_housekeeping_service_performance.sql and 014_housekeeping_service_checklist_state.sql',
  };
}

module.exports = {
  authenticateHousekeepingService,
  resolveBusinessId,
  isSchemaMissingError,
  schemaMissingResponse,
  MANAGE_ROLES,
  EXECUTE_ROLES,
};
