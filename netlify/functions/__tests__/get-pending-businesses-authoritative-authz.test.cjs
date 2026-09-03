const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPER_ADMIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPER_ADMIN_JWT_AUDIENCE = 'super-admin';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const sign = (claims, options = {}) => jwt.sign(claims, process.env.SUPABASE_JWT_SECRET, {
  issuer: process.env.SUPER_ADMIN_JWT_ISSUER,
  audience: process.env.SUPER_ADMIN_JWT_AUDIENCE,
  ...options,
});

const superAdminToken = () => sign({
  sub: 'admin-1',
  role: 'super_admin',
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
    employee_id: 'employee-1',
    role: 'super_admin',
  },
});

const baseEvent = (token, overrides = {}) => ({
  httpMethod: 'GET',
  headers: token ? { authorization: `Bearer ${token}` } : {},
  ...overrides,
});

const loadHandler = async () => (await import('../get-pending-businesses.js')).handler;

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
});

const withFetchMock = async (mockFetch, callback) => {
  const originalFetch = global.fetch;
  global.fetch = mockFetch;
  try {
    return await callback();
  } finally {
    global.fetch = originalFetch;
  }
};

test('pending businesses: anonymous request is rejected', async () => {
  const handler = await loadHandler();
  const result = await handler(baseEvent());
  assert.equal(result.statusCode, 401);
});

test('pending businesses: invalid JWT is rejected', async () => {
  const handler = await loadHandler();
  const result = await handler(baseEvent('not-a-valid-jwt'));
  assert.equal(result.statusCode, 401);
});

test('pending businesses: expired SuperAdmin JWT is rejected', async () => {
  const handler = await loadHandler();
  const result = await handler(baseEvent(sign({ sub: 'admin-1', role: 'super_admin' }, { expiresIn: -1 })));
  assert.equal(result.statusCode, 401);
});

test('pending businesses: business actor is rejected', async () => {
  const handler = await loadHandler();
  const result = await handler(baseEvent(businessToken()));
  assert.equal(result.statusCode, 403);
});

test('pending businesses: employee actor is rejected', async () => {
  const handler = await loadHandler();
  const result = await handler(baseEvent(employeeToken()));
  assert.equal(result.statusCode, 403);
});

test('pending businesses: platform actor is rejected by SuperAdmin gate', async () => {
  const handler = await loadHandler();
  const result = await handler(baseEvent(platformToken()));
  assert.equal(result.statusCode, 403);
});

test('pending businesses: user_metadata SuperAdmin spoof is rejected', async () => {
  const handler = await loadHandler();
  const result = await handler(baseEvent(spoofedSuperAdminToken()));
  assert.equal(result.statusCode, 403);
});

test('pending businesses: service role token is rejected as application identity', async () => {
  const handler = await loadHandler();
  const result = await handler(baseEvent(sign({ sub: 'service-user', role: 'service_role' })));
  assert.equal(result.statusCode, 403);
});

test('pending businesses: authorized SuperAdmin reaches the data layer', async () => {
  const handler = await loadHandler();
  let requestedUrl = null;

  const result = await withFetchMock(async (url) => {
    requestedUrl = url;
    return response(200, [{ id: 'biz-pending', status: 'pending' }]);
  }, () => handler(baseEvent(superAdminToken())));

  assert.equal(result.statusCode, 200);
  assert.match(requestedUrl, /businesses\?status=eq\.pending&select=\*&order=created_at\.desc$/);
  assert.deepEqual(JSON.parse(result.body), {
    success: true,
    data: [{ id: 'biz-pending', status: 'pending' }],
    count: 1,
  });
});

test('pending businesses: database failure is sanitized', async () => {
  const handler = await loadHandler();
  const result = await withFetchMock(async () => response(500, 'SECRET database schema and credentials'), () => handler(baseEvent(superAdminToken())));
  assert.equal(result.statusCode, 500);
  const body = JSON.parse(result.body);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Failed to load pending businesses');
  assert.doesNotMatch(result.body, /SECRET database schema and credentials/);
});

test('pending businesses: malformed upstream JSON is sanitized', async () => {
  const handler = await loadHandler();
  const result = await withFetchMock(async () => response(200, '{SECRET parser details'), () => handler(baseEvent(superAdminToken())));
  assert.equal(result.statusCode, 500);
  const body = JSON.parse(result.body);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Failed to load pending businesses');
  assert.doesNotMatch(result.body, /SECRET parser details/);
});

test('pending businesses: wrong method is rejected', async () => {
  const handler = await loadHandler();
  const result = await handler(baseEvent(superAdminToken(), { httpMethod: 'POST' }));
  assert.equal(result.statusCode, 405);
});

test('pending businesses: OPTIONS remains public preflight', async () => {
  const handler = await loadHandler();
  const result = await handler({ httpMethod: 'OPTIONS', headers: {} });
  assert.equal(result.statusCode, 204);
});
