// Canonical server-side authentication and authorization foundation.
const jwt = require('jsonwebtoken');

const ACTOR_TYPES = Object.freeze({ SUPER_ADMIN: 'super_admin', PLATFORM: 'platform', BUSINESS: 'business', EMPLOYEE: 'employee' });
const PLATFORM_PERMISSIONS = Object.freeze(['platform:businesses:read','platform:businesses:write','platform:change_requests:read','platform:change_requests:write','platform:subscriptions:read','platform:subscriptions:write','platform:payments:read','platform:analytics:read','platform:analytics:export','platform:reports:read','platform:reports:export','platform:audit:read','platform:compliance:read','platform:developers:manage','platform:system:diagnostics']);
const PLATFORM_ROLE_PERMISSIONS = Object.freeze({
  super_admin: PLATFORM_PERMISSIONS,
  platform_operations: ['platform:businesses:read','platform:businesses:write','platform:change_requests:read','platform:change_requests:write','platform:subscriptions:read','platform:subscriptions:write','platform:payments:read','platform:audit:read'],
  platform_developer: ['platform:developers:manage','platform:system:diagnostics'],
  platform_finance: ['platform:subscriptions:read','platform:subscriptions:write','platform:payments:read','platform:reports:read','platform:reports:export'],
  platform_analytics: ['platform:analytics:read','platform:analytics:export','platform:reports:read','platform:reports:export'],
  platform_compliance: ['platform:audit:read','platform:compliance:read','platform:reports:read','platform:reports:export'],
  platform_support: ['platform:businesses:read','platform:change_requests:read'],
});

function extractToken(event) {
  const headers = event?.headers || {};
  const authorization = headers.authorization || headers.Authorization || '';
  const bearer = String(authorization).match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  const cookieHeader = headers.cookie || headers.Cookie || '';
  for (const part of String(cookieHeader).split(';')) {
    const i = part.indexOf('='); if (i < 0 || part.slice(0,i).trim() !== 'fastcheckin_super_admin') continue;
    try { return decodeURIComponent(part.slice(i + 1).trim()) || null; } catch { return null; }
  }
  return null;
}
function verifyToken(token, options = {}) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return { ok:false, status:500, error:'Server authentication is not configured' };
  if (!token) return { ok:false, status:401, error:'Authentication required' };
  try { return { ok:true, decoded:jwt.verify(token, secret, options) }; }
  catch (error) { return { ok:false, status:401, error:error?.name === 'TokenExpiredError' ? 'Authentication token has expired' : 'Invalid authentication token' }; }
}
function asPermissions(value) {
  if (Array.isArray(value)) return value.filter((p) => typeof p === 'string');
  if (typeof value !== 'string') return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : []; } catch { return []; }
}
function platformPermissionsForRole(role) { return Array.isArray(PLATFORM_ROLE_PERMISSIONS[role]) ? [...PLATFORM_ROLE_PERMISSIONS[role]] : []; }
function principalFromDecoded(decoded) {
  if (!decoded || typeof decoded !== 'object') return null;
  const meta = decoded.user_metadata || {};

  // Reserved platform identities must never be asserted through mutable user metadata.
  // A real SuperAdmin is recognized only from the signed top-level role claim and,
  // when required, re-verified with the strict issuer/audience checks below.
  if (meta.role === ACTOR_TYPES.SUPER_ADMIN && decoded.role !== ACTOR_TYPES.SUPER_ADMIN) return null;

  // Supabase service-role tokens are backend credentials, never human application identities.
  // Reject them before considering any platform_role claim so a token cannot combine
  // service_role with a valid platform role to bypass the service-role boundary.
  if (decoded.role === 'service_role') return null;

  if (decoded.role === ACTOR_TYPES.SUPER_ADMIN) return { actorType:'super_admin', role:'super_admin', userId:decoded.sub || null, email:decoded.email || meta.email || null, businessId:null, employeeId:null, permissions:platformPermissionsForRole('super_admin'), active:true };
  const platformRole = decoded.platform_role;
  if (typeof platformRole === 'string' && PLATFORM_ROLE_PERMISSIONS[platformRole]) return { actorType:'platform', role:platformRole, userId:decoded.sub || null, email:decoded.email || meta.email || null, businessId:null, employeeId:null, permissions:platformPermissionsForRole(platformRole), active:decoded.active !== false };
  const businessId = meta.business_id || decoded.business_id || null;
  if (!businessId) return null;
  if (!meta.employee_id) return { actorType:'business', role:'business_owner', userId:decoded.sub || null, email:decoded.email || meta.email || null, businessId, employeeId:null, permissions:asPermissions(meta.permission_set || decoded.permission_set), active:meta.active !== false };
  return { actorType:'employee', role:meta.staff_role || meta.role || 'EmployeeOverview', userId:decoded.sub || null, email:decoded.email || meta.email || null, businessId, employeeId:meta.employee_id, permissions:asPermissions(meta.permission_set || decoded.permission_set), active:meta.active !== false };
}
function strictSuperAdminVerification(event) {
  const verified = verifyToken(extractToken(event), { issuer:process.env.SUPER_ADMIN_JWT_ISSUER || 'fastcheckin', audience:process.env.SUPER_ADMIN_JWT_AUDIENCE || 'super-admin' });
  if (!verified.ok) return verified;
  const principal = principalFromDecoded(verified.decoded);
  return principal?.actorType === ACTOR_TYPES.SUPER_ADMIN ? { ok:true, principal, decoded:verified.decoded } : { ok:false, status:403, error:'Forbidden' };
}
function authenticateRequest(event, options = {}) {
  const verified = verifyToken(extractToken(event)); if (!verified.ok) return verified;
  const principal = principalFromDecoded(verified.decoded);
  if (!principal) return { ok:false, status:403, error:'Token is missing a valid application identity' };
  if (principal.active === false) return { ok:false, status:403, error:'Account is inactive' };
  if (options.actorType && principal.actorType !== options.actorType) return { ok:false, status:403, error:'Forbidden' };
  if (options.actorType === ACTOR_TYPES.SUPER_ADMIN) return strictSuperAdminVerification(event);
  return { ok:true, principal, decoded:verified.decoded };
}
function requireSuperAdmin(event) { return authenticateRequest(event, { actorType:ACTOR_TYPES.SUPER_ADMIN }); }
function requirePlatformActor(event) { const r=authenticateRequest(event); if(!r.ok)return r; if(r.principal.actorType===ACTOR_TYPES.SUPER_ADMIN)return strictSuperAdminVerification(event); return r.principal.actorType===ACTOR_TYPES.PLATFORM ? r : {ok:false,status:403,error:'Platform access required'}; }
function requireBusinessActor(event) { const r=authenticateRequest(event); if(!r.ok)return r; return ['business','employee'].includes(r.principal.actorType) ? r : {ok:false,status:403,error:'Business account access required'}; }
function resolveTenant(principal, requestedBusinessId) {
  if (!principal) return {ok:false,status:401,error:'Authentication required'};
  if (principal.actorType === 'super_admin' || principal.actorType === 'platform') return requestedBusinessId ? {ok:true,businessId:String(requestedBusinessId)} : {ok:false,status:400,error:'businessId required'};
  if (requestedBusinessId && String(requestedBusinessId) !== String(principal.businessId)) return {ok:false,status:403,error:'Forbidden: business scope mismatch'};
  return {ok:true,businessId:String(principal.businessId)};
}
function requirePermission(principal, permission) { return !!principal && Array.isArray(principal.permissions) && principal.permissions.includes(permission); }
function requirePlatformPermission(principal, permission) { return !!principal && ['super_admin','platform'].includes(principal.actorType) && requirePermission(principal,permission); }
function requireBusinessPermission(principal, permission) {
  if (!principal || !['business','employee'].includes(principal.actorType)) return false;
  if (principal.actorType === 'business' || principal.role === 'business_owner') return true;
  if (requirePermission(principal, permission)) return true;
  if (principal.permissions.includes('canManageLostFound') && ['canViewLostFound','canCreateLostFound','canEditLostFound','canDisposeLostFound'].includes(permission)) return true;
  return false;
}
function authorize(principal, permission) { if(!principal)return {ok:false,status:401,error:'Authentication required'}; return requirePermission(principal,permission) ? {ok:true,principal} : {ok:false,status:403,error:`Missing permission: ${permission}`}; }
function authFailure(result, headers={}) { return {statusCode:result.status || 403, headers:{'Content-Type':'application/json',...headers}, body:JSON.stringify({success:false,error:result.error || 'Forbidden'})}; }
module.exports={ACTOR_TYPES,PLATFORM_PERMISSIONS,PLATFORM_ROLE_PERMISSIONS,extractToken,verifyToken,principalFromDecoded,platformPermissionsForRole,authenticateRequest,requireSuperAdmin,requirePlatformActor,requireBusinessActor,resolveTenant,requirePermission,requirePlatformPermission,requireBusinessPermission,authorize,authFailure};