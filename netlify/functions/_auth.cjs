// Canonical server-side authentication and authorization foundation.
// All protected Netlify Functions should use this module instead of inventing
// their own JWT parsing or tenant checks.
const jwt = require('jsonwebtoken');

const ACTOR_TYPES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  BUSINESS: 'business',
  EMPLOYEE: 'employee',
});

const PLATFORM_PERMISSIONS = Object.freeze([
  'canViewPlatformAnalytics',
  'canViewOriginAnalytics',
  'canViewEstablishmentPerformance',
]);

function extractToken(event) {
  const headers = event?.headers || {};
  const authorization = headers.authorization || headers.Authorization || '';
  const bearer = String(authorization).match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();

  const cookieHeader = headers.cookie || headers.Cookie || '';
  if (cookieHeader) {
    for (const part of String(cookieHeader).split(';')) {
      const index = part.indexOf('=');
      if (index === -1) continue;
      const name = part.slice(0, index).trim();
      if (name !== 'fastcheckin_super_admin') continue;
      try { return decodeURIComponent(part.slice(index + 1).trim()) || null; } catch { return null; }
    }
  }
  return null;
}

function verifyToken(token, options = {}) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return { ok: false, status: 500, error: 'Server authentication is not configured' };
  if (!token) return { ok: false, status: 401, error: 'Authentication required' };
  try {
    return { ok: true, decoded: jwt.verify(token, secret, options) };
  } catch (error) {
    return {
      ok: false,
      status: 401,
      error: error?.name === 'TokenExpiredError' ? 'Authentication token has expired' : 'Invalid authentication token',
    };
  }
}

function asPermissions(value) {
  if (Array.isArray(value)) return value.filter((p) => typeof p === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
  } catch { return []; }
}

function principalFromDecoded(decoded) {
  if (!decoded || typeof decoded !== 'object') return null;
  const meta = decoded.user_metadata || {};
  const explicitSuperAdmin = decoded.role === ACTOR_TYPES.SUPER_ADMIN || meta.super_admin === true || meta.super_admin === 'true';

  if (explicitSuperAdmin) {
    return {
      actorType: ACTOR_TYPES.SUPER_ADMIN,
      role: ACTOR_TYPES.SUPER_ADMIN,
      userId: decoded.sub || null,
      email: decoded.email || meta.email || null,
      businessId: null,
      employeeId: null,
      permissions: asPermissions(meta.permission_set),
      active: true,
    };
  }

  const businessId = meta.business_id || decoded.business_id || null;
  if (!businessId) return null;

  if (!meta.employee_id) {
    return {
      actorType: ACTOR_TYPES.BUSINESS,
      role: 'business_owner',
      userId: decoded.sub || null,
      email: decoded.email || meta.email || null,
      businessId,
      employeeId: null,
      permissions: asPermissions(meta.permission_set),
      active: meta.active !== false,
    };
  }

  return {
    actorType: ACTOR_TYPES.EMPLOYEE,
    role: meta.staff_role || meta.role || 'EmployeeOverview',
    userId: decoded.sub || null,
    email: decoded.email || meta.email || null,
    businessId,
    employeeId: meta.employee_id,
    permissions: asPermissions(meta.permission_set),
    active: meta.active !== false,
  };
}

function authenticateRequest(event, options = {}) {
  const verified = verifyToken(extractToken(event));
  if (!verified.ok) return verified;
  const principal = principalFromDecoded(verified.decoded);
  if (!principal) return { ok: false, status: 403, error: 'Token is missing a valid application identity' };
  if (principal.active === false) return { ok: false, status: 403, error: 'Account is inactive' };

  if (options.actorType && principal.actorType !== options.actorType) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  if (options.actorType === ACTOR_TYPES.SUPER_ADMIN) {
    const strict = verifyToken(extractToken(event), { issuer: 'fastcheckin', audience: 'super-admin' });
    if (!strict.ok) return strict;
    const strictPrincipal = principalFromDecoded(strict.decoded);
    if (!strictPrincipal || strictPrincipal.actorType !== ACTOR_TYPES.SUPER_ADMIN) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
    return { ok: true, principal: strictPrincipal, decoded: strict.decoded };
  }

  return { ok: true, principal, decoded: verified.decoded };
}

function requireSuperAdmin(event) {
  return authenticateRequest(event, { actorType: ACTOR_TYPES.SUPER_ADMIN });
}

function requireBusinessActor(event) {
  const result = authenticateRequest(event);
  if (!result.ok) return result;
  if (result.principal.actorType !== ACTOR_TYPES.BUSINESS && result.principal.actorType !== ACTOR_TYPES.EMPLOYEE) {
    return { ok: false, status: 403, error: 'Business account access required' };
  }
  return result;
}

function resolveTenant(principal, requestedBusinessId) {
  if (!principal) return { ok: false, status: 401, error: 'Authentication required' };
  if (principal.actorType === ACTOR_TYPES.SUPER_ADMIN) {
    if (!requestedBusinessId) return { ok: false, status: 400, error: 'businessId required' };
    return { ok: true, businessId: String(requestedBusinessId) };
  }
  if (requestedBusinessId && String(requestedBusinessId) !== String(principal.businessId)) {
    return { ok: false, status: 403, error: 'Forbidden: business scope mismatch' };
  }
  return { ok: true, businessId: String(principal.businessId) };
}

function requirePermission(principal, permission) {
  if (!principal) return false;
  if (principal.actorType === ACTOR_TYPES.SUPER_ADMIN) return true;
  return principal.permissions.includes(permission);
}

function authorize(principal, permission) {
  if (!principal) return { ok: false, status: 401, error: 'Authentication required' };
  if (!requirePermission(principal, permission)) return { ok: false, status: 403, error: `Missing permission: ${permission}` };
  return { ok: true, principal };
}

function authFailure(result, headers = {}) {
  return {
    statusCode: result.status || 403,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ success: false, error: result.error || 'Forbidden' }),
  };
}

module.exports = {
  ACTOR_TYPES,
  PLATFORM_PERMISSIONS,
  extractToken,
  verifyToken,
  principalFromDecoded,
  authenticateRequest,
  requireSuperAdmin,
  requireBusinessActor,
  resolveTenant,
  requirePermission,
  authorize,
  authFailure,
};
