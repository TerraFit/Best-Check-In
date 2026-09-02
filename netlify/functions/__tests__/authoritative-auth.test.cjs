const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';

const auth = require('../_auth.cjs');

function eventWithToken(token) {
  return { headers: { authorization: `Bearer ${token}` } };
}

function sign(payload, options = {}) {
  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, { expiresIn: '15m', ...options });
}

function signSuperAdmin(payload = {}, options = {}) {
  return sign(
    {
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'super_admin',
      user_metadata: { super_admin: true },
      ...payload,
    },
    { issuer: 'fastcheckin', audience: 'super-admin', ...options },
  );
}

function signPlatform(platformRole, payload = {}) {
  return sign({ sub: `${platformRole}-1`, email: `${platformRole}@example.com`, platform_role: platformRole, ...payload });
}

test('anonymous request is rejected with 401', () => {
  const result = auth.authenticateRequest({ headers: {} });
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('invalid JWT is rejected with 401', () => {
  const result = auth.authenticateRequest(eventWithToken('not-a-jwt'));
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('service-role JWT is not treated as a human application identity', () => {
  const token = sign({ role: 'service_role', sub: 'service' });
  const result = auth.authenticateRequest(eventWithToken(token));
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test('SuperAdmin identity requires the canonical issuer and audience', () => {
  const token = signSuperAdmin();
  const result = auth.requireSuperAdmin(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(result.principal.actorType, 'super_admin');
  assert.equal(result.principal.businessId, null);
});

test('SuperAdmin receives the full explicit platform permission set', () => {
  const token = signSuperAdmin();
  const result = auth.requireSuperAdmin(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.deepEqual(result.principal.permissions, auth.PLATFORM_PERMISSIONS);
  for (const permission of auth.PLATFORM_PERMISSIONS) {
    assert.equal(auth.requirePlatformPermission(result.principal, permission), true);
  }
});

test('SuperAdmin cannot be elevated from user-editable metadata alone', () => {
  const token = sign({ sub: 'user-1', user_metadata: { super_admin: true } });
  const result = auth.requireSuperAdmin(eventWithToken(token));
  assert.equal(result.ok, false);
});

test('SuperAdmin token with wrong audience is rejected', () => {
  const token = signSuperAdmin({}, { audience: 'business' });
  const result = auth.requireSuperAdmin(eventWithToken(token));
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('SuperAdmin token with wrong issuer is rejected', () => {
  const token = signSuperAdmin({}, { issuer: 'other-service' });
  const result = auth.requireSuperAdmin(eventWithToken(token));
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('platform authorization preserves strict SuperAdmin audience validation', () => {
  const token = signSuperAdmin({}, { audience: 'business' });
  const result = auth.requirePlatformActor(eventWithToken(token));
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('platform authorization preserves strict SuperAdmin issuer validation', () => {
  const token = signSuperAdmin({}, { issuer: 'other-service' });
  const result = auth.requirePlatformActor(eventWithToken(token));
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('valid SuperAdmin remains a platform actor with full platform permissions', () => {
  const token = signSuperAdmin();
  const result = auth.requirePlatformActor(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(result.principal.actorType, 'super_admin');
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:analytics:read'), true);
});

test('business token cannot satisfy SuperAdmin authorization', () => {
  const token = sign({ sub: 'business-1', user_metadata: { business_id: 'biz-a' } });
  const result = auth.requireSuperAdmin(eventWithToken(token));
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test('employee token cannot cross tenant boundary', () => {
  const token = sign({ sub: 'employee-1', user_metadata: { business_id: 'biz-a', employee_id: 'emp-1', staff_role: 'EmployeeOverview' } });
  const result = auth.authenticateRequest(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(auth.resolveTenant(result.principal, 'biz-b').ok, false);
  assert.equal(auth.resolveTenant(result.principal, 'biz-a').businessId, 'biz-a');
});

test('SuperAdmin may intentionally resolve a requested platform tenant', () => {
  const token = signSuperAdmin();
  const result = auth.requireSuperAdmin(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(auth.resolveTenant(result.principal, 'biz-b').businessId, 'biz-b');
});

test('platform operations has business lifecycle access but not developer or analytics access', () => {
  const token = signPlatform('platform_operations');
  const result = auth.requirePlatformActor(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(result.principal.role, 'platform_operations');
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:businesses:write'), true);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:developers:manage'), false);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:analytics:read'), false);
});

test('platform developer cannot access business, finance, or analytics permissions', () => {
  const token = signPlatform('platform_developer');
  const result = auth.requirePlatformActor(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:developers:manage'), true);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:businesses:write'), false);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:payments:read'), false);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:analytics:read'), false);
});

test('platform finance is limited to commercial/reporting permissions', () => {
  const token = signPlatform('platform_finance');
  const result = auth.requirePlatformActor(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:payments:read'), true);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:reports:export'), true);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:analytics:read'), false);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:developers:manage'), false);
});

test('platform analytics is limited to analytics and reporting permissions', () => {
  const token = signPlatform('platform_analytics');
  const result = auth.requirePlatformActor(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:analytics:read'), true);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:analytics:export'), true);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:payments:read'), false);
  assert.equal(auth.requirePlatformPermission(result.principal, 'platform:businesses:write'), false);
});

test('platform roles are platform-wide but still require an explicit target tenant', () => {
  const token = signPlatform('platform_support');
  const result = auth.requirePlatformActor(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(result.principal.businessId, null);
  assert.equal(auth.resolveTenant(result.principal).ok, false);
  assert.equal(auth.resolveTenant(result.principal, 'biz-b').businessId, 'biz-b');
});

test('platform analytics permissions are explicit and centrally defined', () => {
  assert.deepEqual(auth.PLATFORM_ROLE_PERMISSIONS.platform_analytics, [
    'platform:analytics:read',
    'platform:analytics:export',
    'platform:reports:read',
    'platform:reports:export',
  ]);
});
