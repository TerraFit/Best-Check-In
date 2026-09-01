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

test('service-role JWT is not treated as a human SuperAdmin', () => {
  const token = sign({ role: 'service_role', sub: 'service' });
  const result = auth.authenticateRequest(eventWithToken(token));
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test('SuperAdmin identity is recognised only from an explicit SuperAdmin claim', () => {
  const token = sign({ sub: 'admin-1', email: 'admin@example.com', user_metadata: { super_admin: true } });
  const result = auth.requireSuperAdmin(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(result.principal.actorType, 'super_admin');
  assert.equal(result.principal.businessId, null);
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
  const token = sign({ sub: 'admin-1', user_metadata: { super_admin: true } });
  const result = auth.requireSuperAdmin(eventWithToken(token));
  assert.equal(result.ok, true);
  assert.equal(auth.resolveTenant(result.principal, 'biz-b').businessId, 'biz-b');
});

test('platform analytics permissions are explicit application permissions', () => {
  assert.deepEqual(auth.PLATFORM_PERMISSIONS, [
    'canViewPlatformAnalytics',
    'canViewOriginAnalytics',
    'canViewEstablishmentPerformance',
  ]);
});
