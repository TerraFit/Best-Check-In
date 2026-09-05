const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '15m', ...options }); }
function event(token, queryStringParameters, httpMethod = 'GET') {
  return { httpMethod, headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters };
}
function businessToken(businessId = 'biz-a', permissions = ['canExportReports']) {
  return sign({ sub: `owner-${businessId}`, user_metadata: { business_id: businessId, permission_set: permissions } });
}
function employeeToken(businessId = 'biz-a', permissions = ['canExportReports'], extraMetadata = {}) {
  return sign({ sub: `emp-${businessId}`, user_metadata: { business_id: businessId, employee_id: `emp-${businessId}`, staff_role: 'EmployeeOverview', permission_set: permissions, ...extraMetadata } });
}
function platformToken(role = 'platform_analytics') { return sign({ sub: 'platform-1', platform_role: role }); }
function serviceRoleToken() { return sign({ sub: 'service-role', role: 'service_role' }); }
function superAdminToken() { return sign({ sub: 'admin-1', role: 'super_admin' }, { issuer: 'fastcheckin', audience: 'super-admin' }); }
async function loadFunction() { return import(`../generate-bi-report.js?test=${Date.now()}-${Math.random()}`); }
function mockFetch() {
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    json: async () => String(url).includes('/businesses?')
      ? [{ id: 'biz-a', trading_name: 'Test Lodge', registered_name: 'Test Lodge', total_rooms: 1, status: 'approved', service_paused: false }]
      : [],
    text: async () => ''
  });
}

test('BI report: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('BI report: invalid JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('not-a-valid-jwt', { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('BI report: expired JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({ sub: 'owner-biz-a', user_metadata: { business_id: 'biz-a' } }, { expiresIn: -1 });
  const result = await handler(event(token, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('BI report: employee without export permission is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a', []), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('BI report: employee cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('BI report: platform actor is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(platformToken(), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('BI report: service-role JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(serviceRoleToken(), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('BI report: super admin is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(superAdminToken(), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('BI report: metadata-only super_admin spoof is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({ sub: 'spoof', role: 'authenticated', user_metadata: { role: 'super_admin', business_id: 'biz-a', employee_id: 'emp-a', permission_set: ['canExportReports'] } });
  const result = await handler(event(token, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('BI report: business owner is allowed without employee permission metadata', async () => {
  mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken('biz-a'), { businessId: 'biz-a' }));
  assert.notEqual(result.statusCode, 401);
  assert.notEqual(result.statusCode, 403);
});

test('BI report: authorized employee is tenant-bound', async () => {
  mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { businessId: 'biz-a' }));
  assert.notEqual(result.statusCode, 403);
});

test('BI report: wrong HTTP method is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { businessId: 'biz-a' }, 'POST'));
  assert.equal(result.statusCode, 405);
});

test('BI report: OPTIONS remains public preflight', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, null, 'OPTIONS'));
  assert.equal(result.statusCode, 204);
});
