const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPER_ADMIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPER_ADMIN_JWT_AUDIENCE = 'super-admin';

const { handler } = require('../generate-analytics-snapshot.js');

const baseEvent = (token, queryStringParameters = {}) => ({
  httpMethod: 'GET',
  headers: token ? { authorization: `Bearer ${token}` } : {},
  queryStringParameters,
});

const sign = (claims, options = {}) => jwt.sign(claims, process.env.SUPABASE_JWT_SECRET, {
  ...options,
});

const businessToken = () => sign({
  sub: 'business-user-1',
  role: 'authenticated',
  user_metadata: { business_id: 'biz-a' },
});

const employeeToken = (permissions = ['canViewReports']) => sign({
  sub: 'employee-1',
  role: 'authenticated',
  user_metadata: {
    business_id: 'biz-a',
    employee_id: 'employee-1',
    staff_role: 'Supervisor',
    permission_set: permissions,
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
    employee_id: 'employee-1',
    role: 'super_admin',
    permission_set: ['canExportReports'],
  },
});

test('analytics snapshot: anonymous request is rejected', async () => {
  const result = await handler(baseEvent());
  assert.equal(result.statusCode, 401);
});

test('analytics snapshot: invalid JWT is rejected', async () => {
  const result = await handler(baseEvent('not-a-valid-jwt'));
  assert.equal(result.statusCode, 401);
});

test('analytics snapshot: business actor can enter the business authorization gate', async () => {
  const result = await handler(baseEvent(businessToken(), { businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('analytics snapshot: employee without export permission is rejected', async () => {
  const result = await handler(baseEvent(employeeToken(['canViewDashboard'])));
  assert.equal(result.statusCode, 403);
});

test('analytics snapshot: employee with export permission cannot substitute another tenant', async () => {
  const result = await handler(baseEvent(employeeToken(['canExportReports']), { businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('analytics snapshot: platform actor is rejected by business-actor gate', async () => {
  const result = await handler(baseEvent(platformToken(), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('analytics snapshot: user_metadata super_admin spoof is rejected', async () => {
  const result = await handler(baseEvent(spoofedSuperAdminToken(), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('analytics snapshot: service role token is rejected', async () => {
  const token = sign({ sub: 'service-user', role: 'service_role' });
  const result = await handler(baseEvent(token, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('analytics snapshot: expired token is rejected', async () => {
  const token = sign({
    sub: 'business-user-1',
    role: 'authenticated',
    user_metadata: { business_id: 'biz-a' },
  }, { expiresIn: -1 });
  const result = await handler(baseEvent(token, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('analytics snapshot: wrong method is rejected', async () => {
  const result = await handler({ httpMethod: 'POST', headers: {} });
  assert.equal(result.statusCode, 405);
});

test('analytics snapshot: OPTIONS remains public preflight', async () => {
  const result = await handler({ httpMethod: 'OPTIONS', headers: {} });
  assert.equal(result.statusCode, 204);
});
