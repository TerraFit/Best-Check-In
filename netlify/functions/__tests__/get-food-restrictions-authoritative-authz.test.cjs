const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
const SECRET = process.env.SUPABASE_JWT_SECRET;

function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: '15m' }); }
function businessToken(id = 'biz-a') { return sign({ sub: `owner-${id}`, user_metadata: { business_id: id } }); }
function employeeToken(id = 'biz-a', permissions = ['canViewDashboard']) { return sign({ sub: `emp-${id}`, user_metadata: { business_id: id, employee_id: `emp-${id}`, permission_set: permissions } }); }
function event(token, bookingId = 'booking-1') { return { httpMethod: 'GET', headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters: bookingId === undefined ? {} : { bookingId } }; }
async function loadFunction() { return import(`../get-food-restrictions.js?test=${Date.now()}-${Math.random()}`); }
function mockFetch(bookingBusinessId = 'biz-a', restrictionRows = []) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/bookings?')) return { ok: true, status: 200, json: async () => [{ id: 'booking-1', business_id: bookingBusinessId }] };
    return { ok: true, status: 200, json: async () => restrictionRows, text: async () => JSON.stringify(restrictionRows) };
  };
  return calls;
}

test('food restrictions: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  assert.equal((await handler(event(null))).statusCode, 401);
});

test('food restrictions: employee cannot read another tenant booking', async () => {
  mockFetch('biz-b');
  const { handler } = await loadFunction();
  assert.equal((await handler(event(employeeToken('biz-a')))).statusCode, 403);
});

test('food restrictions: authorized employee is tenant scoped', async () => {
  const calls = mockFetch('biz-a', [{ booking_id: 'booking-1', vegan: true }]);
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a')));
  assert.equal(result.statusCode, 200);
  assert.match(calls[0].url, /bookings\?id=eq\.booking-1/);
  assert.match(calls[1].url, /booking_food_restrictions\?booking_id=eq\.booking-1/);
});

test('food restrictions: missing booking returns not found', async () => {
  global.fetch = async () => ({ ok: true, status: 200, json: async () => [] });
  const { handler } = await loadFunction();
  assert.equal((await handler(event(businessToken()))).statusCode, 404);
});

test('food restrictions: oversized booking id is rejected', async () => {
  const { handler } = await loadFunction();
  assert.equal((await handler(event(businessToken(), 'x'.repeat(201)))).statusCode, 400);
});
