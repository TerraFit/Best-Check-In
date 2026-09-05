const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '15m', ...options }); }
function event(token, queryStringParameters) {
  return { httpMethod: 'GET', headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters };
}
function businessToken(businessId = 'biz-a') {
  return sign({ sub: `owner-${businessId}`, user_metadata: { business_id: businessId } });
}
function employeeToken(businessId = 'biz-a', role = 'EmployeeOverview', permissions = []) {
  return sign({ sub: `emp-${businessId}`, user_metadata: { business_id: businessId, employee_id: `emp-${businessId}`, staff_role: role, permission_set: permissions } });
}
async function loadFunction() { return import(`../get-audit-logs.js?test=${Date.now()}-${Math.random()}`); }
function mockFetch() {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => [{ id: 'log-1', business_id: 'biz-a', action: 'check_in', details: {} }], text: async () => '' };
  };
  return calls;
}

test('audit logs: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('audit logs: invalid JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('not-a-valid-jwt', { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('audit logs: business owner may read its own tenant', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken('biz-a'), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 200);
  assert.match(calls[0].url, /business_id=eq\.biz-a/);
});

test('audit logs: employee without audit permission is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('audit logs: role defaults preserve audit access for administration staff', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a', 'administration'), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 200);
  assert.match(calls[0].url, /business_id=eq\.biz-a/);
});

test('audit logs: explicit audit permission allows employee access', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a', 'custom', ['canViewAuditLog']), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 200);
  assert.match(calls[0].url, /business_id=eq\.biz-a/);
});

test('audit logs: business actor cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken('biz-a'), { businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('audit logs: employee cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a', 'administration'), { businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('audit logs: businessId remains required', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken('biz-a')));
  assert.equal(result.statusCode, 400);
});

test('audit logs: response mapping and pagination shape are preserved', async () => {
  mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken('biz-a'), { businessId: 'biz-a', limit: '25', offset: '10' }));
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(result.body);
  assert.equal(body.success, true);
  assert.equal(body.data[0].user_name, 'Unknown User');
  assert.equal(body.data[0].guest_name, 'Unknown Guest');
  assert.equal(body.limit, 25);
  assert.equal(body.offset, 10);
});
