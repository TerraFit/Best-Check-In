const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPER_ADMIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPER_ADMIN_JWT_AUDIENCE = 'super-admin';

const { handler } = require('../get-export-audit-logs.js');

const baseEvent = (token, queryStringParameters = {}) => ({
  httpMethod: 'GET',
  headers: token ? { authorization: `Bearer ${token}` } : {},
  queryStringParameters,
});

const sign = (claims, options = {}) => jwt.sign(claims, process.env.SUPABASE_JWT_SECRET, {
  issuer: process.env.SUPER_ADMIN_JWT_ISSUER,
  audience: process.env.SUPER_ADMIN_JWT_AUDIENCE,
  ...options,
});

const businessToken = () => sign({
  sub: 'business-user-1',
  role: 'authenticated',
  user_metadata: { business_id: 'biz-a' },
});

const employeeToken = () => sign({
  sub: 'employee-1',
  role: 'authenticated',
  user_metadata: {
    business_id: 'biz-a',
    employee_id: 'employee-1',
    staff_role: 'Manager',
    permission_set: ['canViewDashboard'],
  },
});

const platformToken = () => sign({
  sub: 'platform-1',
  role: 'authenticated',
  platform_role: 'platform_operations',
});

const spoofedSuperAdminToken = () => sign({
  sub: 'employee-1',
  role: 'authenticated',
  user_metadata: {
    business_id: 'biz-a',
    role: 'super_admin',
    employee_id: 'employee-1',
  },
});

test('export audit logs: anonymous request is rejected', async () => {
  const result = await handler(baseEvent());
  assert.equal(result.statusCode, 401);
});

test('export audit logs: invalid JWT is rejected', async () => {
  const result = await handler(baseEvent('not-a-valid-jwt'));
  assert.equal(result.statusCode, 401);
});

test('export audit logs: business actor is rejected', async () => {
  const result = await handler(baseEvent(businessToken()));
  assert.equal(result.statusCode, 403);
});

test('export audit logs: employee actor is rejected', async () => {
  const result = await handler(baseEvent(employeeToken()));
  assert.equal(result.statusCode, 403);
});

test('export audit logs: platform actor is rejected by super-admin gate', async () => {
  const result = await handler(baseEvent(platformToken()));
  assert.equal(result.statusCode, 403);
});

test('export audit logs: user_metadata super_admin spoof is rejected', async () => {
  const result = await handler(baseEvent(spoofedSuperAdminToken()));
  assert.equal(result.statusCode, 403);
});

test('export audit logs: service role token is rejected', async () => {
  const token = sign({ sub: 'service-user', role: 'service_role' });
  const result = await handler(baseEvent(token));
  assert.equal(result.statusCode, 403);
});

test('export audit logs: expired super-admin token is rejected', async () => {
  const token = sign({ sub: 'admin-1', role: 'super_admin' }, { expiresIn: -1 });
  const result = await handler(baseEvent(token));
  assert.equal(result.statusCode, 401);
});

test('export audit logs: wrong method is rejected', async () => {
  const result = await handler({ httpMethod: 'POST', headers: {} });
  assert.equal(result.statusCode, 405);
});

test('export audit logs: OPTIONS remains public preflight', async () => {
  const result = await handler({ httpMethod: 'OPTIONS', headers: {} });
  assert.equal(result.statusCode, 204);
});
