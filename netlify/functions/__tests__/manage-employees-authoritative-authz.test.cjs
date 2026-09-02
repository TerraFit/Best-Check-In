const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '15m', ...options }); }
function event(method, token, body, queryStringParameters) {
  return { httpMethod: method, headers: token ? { authorization: `Bearer ${token}` } : {}, body: body === undefined ? undefined : JSON.stringify(body), queryStringParameters };
}
function businessToken(businessId = 'biz-a') {
  return sign({ sub: `owner-${businessId}`, user_metadata: { business_id: businessId } });
}
function employeeToken(businessId = 'biz-a', permissions = ['canViewDashboard']) {
  return sign({ sub: `emp-${businessId}`, user_metadata: { business_id: businessId, employee_id: `emp-${businessId}`, staff_role: 'Manager', permission_set: permissions } });
}
async function loadFunction() { return import(`../manage-employees.js?test=${Date.now()}-${Math.random()}`); }

function mockFetch() {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => [{ id: 'emp-1', business_id: 'biz-a', full_name: 'Employee' }], text: async () => '' };
  };
  return calls;
}

test('manage-employees: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('GET', null, undefined, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('manage-employees: invalid JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('GET', 'not-a-valid-jwt', undefined, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('manage-employees: employee without staff-management permission is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('GET', employeeToken('biz-a'), undefined, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('manage-employees: business actor cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('GET', businessToken('biz-a'), undefined, { businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('manage-employees: authorized owner reads only the authoritative tenant', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event('GET', businessToken('biz-a'), undefined, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 200);
  assert.match(calls[0].url, /business_id=eq\.biz-a/);
});

test('manage-employees: employee mutation is tenant-scoped', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event('PATCH', employeeToken('biz-a', ['canManageStaff']), { id: 'emp-1', status: 'Active' }));
  assert.equal(result.statusCode, 200);
  assert.match(calls[0].url, /id=eq\.emp-1&business_id=eq\.biz-a/);
});

test('manage-employees: employee creation binds business_id to authenticated tenant', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event('POST', businessToken('biz-a'), { businessId: 'biz-b', full_name: 'New Employee', phone_number: '+27 82 123 4567' }));
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body[0].business_id, 'biz-a');
});

test('manage-employees: employee deletion is tenant-scoped', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event('DELETE', businessToken('biz-a'), { id: 'emp-1' }));
  assert.equal(result.statusCode, 200);
  assert.match(calls[0].url, /id=eq\.emp-1&business_id=eq\.biz-a/);
});
