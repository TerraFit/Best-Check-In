const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '15m', ...options }); }
function event(token, queryStringParameters) { return { httpMethod: 'GET', headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters }; }
function employeeToken(businessId = 'biz-a', extraMetadata = {}) {
  return sign({ sub: `emp-${businessId}`, user_metadata: { business_id: businessId, employee_id: `emp-${businessId}`, staff_role: 'EmployeeOverview', ...extraMetadata } });
}
function businessToken(businessId = 'biz-a') { return sign({ sub: `owner-${businessId}`, user_metadata: { business_id: businessId } }); }
async function loadFunction() { return import(`../get-employee-overview.js?test=${Date.now()}-${Math.random()}`); }
function mockFetch() {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => [], text: async () => '' };
  };
  return calls;
}

test('employee overview: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('employee overview: invalid JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('not-a-valid-jwt', { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('employee overview: business owner cannot use employee-only endpoint', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken('biz-a'), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('employee overview: employee cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('employee overview: authorized employee queries only the authenticated tenant', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 200);
  assert.equal(calls.length, 3);
  for (const call of calls) assert.match(call.url, /business_id=eq\.biz-a/);
});

test('employee overview: employee identity is required', async () => {
  const token = sign({ sub: 'user-1', user_metadata: { business_id: 'biz-a' } });
  const { handler } = await loadFunction();
  const result = await handler(event(token, { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('employee overview: response preserves arrivals, stayovers and departures shape', async () => {
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    json: async () => String(url).includes('booking_food_restrictions') ? [{ booking_id: 'b1', vegan: true }] : [{ id: 'b1', guest_name: 'Guest', check_in_date: '2026-09-02', check_out_date: '2026-09-04' }],
    text: async () => ''
  });
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(result.body);
  assert.equal(body.success, true);
  assert.ok('date' in body);
  assert.ok(Array.isArray(body.arrivals));
  assert.ok(Array.isArray(body.stayovers));
  assert.ok(Array.isArray(body.departures));
  assert.equal(body.arrivals[0].food_restrictions.vegan, true);
});
