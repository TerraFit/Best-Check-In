const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const ORIGINAL_ENV = { ...process.env };
const originalFetch = global.fetch;

function loadHandler() {
  const path = require.resolve('../get-guest-details.js');
  delete require.cache[path];
  return require(path).handler;
}

function event({ method = 'GET', bookingId, token } = {}) {
  return {
    httpMethod: method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    queryStringParameters: bookingId === undefined ? {} : { bookingId }
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

function setConfiguredEnv() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  process.env.SUPABASE_JWT_SECRET = 'test-secret';
}

function token({ businessId = 'biz-a', permissionSet = ['canViewGuestDetails'], role = 'manager', employeeId = 'emp-1', active = true } = {}) {
  return jwt.sign({
    sub: employeeId,
    email: 'employee@example.com',
    user_metadata: {
      business_id: businessId,
      employee_id: employeeId,
      staff_role: role,
      permission_set: permissionSet,
      active
    }
  }, process.env.SUPABASE_JWT_SECRET);
}

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = originalFetch;
}

test.afterEach(restoreEnv);

test('OPTIONS remains public', async () => {
  setConfiguredEnv();
  const handler = loadHandler();
  const response = await handler(event({ method: 'OPTIONS' }));
  assert.equal(response.statusCode, 204);
});

test('non-GET methods are rejected', async () => {
  setConfiguredEnv();
  const handler = loadHandler();
  const response = await handler(event({ method: 'POST', bookingId: 'booking-1' }));
  assert.equal(response.statusCode, 405);
});

test('missing booking id is rejected before data-layer access', async () => {
  setConfiguredEnv();
  const tokenValue = token();
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = loadHandler();
  const response = await handler(event({ token: tokenValue }));
  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('anonymous requests are rejected before booking access', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = loadHandler();
  const response = await handler(event({ bookingId: 'booking-1' }));
  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('invalid JWT is rejected before booking access', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = loadHandler();
  const response = await handler(event({ bookingId: 'booking-1', token: 'not-a-jwt' }));
  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('business actor without employee record is rejected when it lacks guest-detail permission semantics', async () => {
  setConfiguredEnv();
  const ownerToken = jwt.sign({
    sub: 'owner-1',
    email: 'owner@example.com',
    user_metadata: { business_id: 'biz-a', active: true }
  }, process.env.SUPABASE_JWT_SECRET);
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = loadHandler();
  const response = await handler(event({ bookingId: 'booking-1', token: ownerToken }));
  assert.equal(response.statusCode, 200);
  assert.equal(fetchCalls, 1);
});

test('employee with only limited guest permission is denied full guest details', async () => {
  setConfiguredEnv();
  const limitedToken = token({ permissionSet: ['canViewGuestLimited'] });
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = loadHandler();
  const response = await handler(event({ bookingId: 'booking-1', token: limitedToken }));
  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('employee with unrelated permission is denied before booking access', async () => {
  setConfiguredEnv();
  const unrelatedToken = token({ permissionSet: ['canViewRooms'] });
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = loadHandler();
  const response = await handler(event({ bookingId: 'booking-1', token: unrelatedToken }));
  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('inactive employee is denied before booking access', async () => {
  setConfiguredEnv();
  const inactiveToken = token({ active: false });
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = loadHandler();
  const response = await handler(event({ bookingId: 'booking-1', token: inactiveToken }));
  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('tenant substitution is rejected before booking access', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return jsonResponse([{ id: 'booking-1', business_id: 'biz-other' }]);
  };
  const handler = loadHandler();
  const response = await handler(event({ bookingId: 'booking-1', token: token({ businessId: 'biz-a' }) }));
  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /business_id=eq\.biz-a/);
  assert.match(urls[0], /id=eq\.booking-1/);
});

test('authorized employee lookup is tenant-bound and returns guest details', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    if (urls.length === 1) return jsonResponse([{
      id: 'booking-1', business_id: 'biz-a', guest_name: 'Jane Doe', guest_first_name: 'Jane',
      guest_last_name: 'Doe', guest_email: 'jane@example.com', guest_phone: '+410000000',
      guest_country: 'CH', arriving_from: 'Zurich', next_destination: 'Cape Town', adults: 2,
      children: 1, check_in_date: '2026-09-01', check_out_date: '2026-09-03', nights: 2,
      room_id: 'room-1', room_number: 3, room_name: 'Stone'
    }]);
    return jsonResponse([{
      booking_id: 'booking-1', vegetarian: false, vegan: false, other: true, other_text: 'No dairy'
    }]);
  };
  const handler = loadHandler();
  const response = await handler(event({ bookingId: 'booking-1', token: token() }));
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.business_id, 'biz-a');
  assert.equal(body.guest_email, 'jane@example.com');
  assert.equal(body.food_restrictions.other_text, 'No dairy');
  assert.equal(urls.length, 2);
  assert.match(urls[0], /bookings\?/);
  assert.match(urls[0], /business_id=eq\.biz-a/);
  assert.match(urls[0], /id=eq\.booking-1/);
  assert.match(urls[1], /booking_food_restrictions\?/);
  assert.match(urls[1], /booking_id=eq\.booking-1/);
});

test('booking data-layer failure does not expose guest details', async () => {
  setConfiguredEnv();
  global.fetch = async () => ({ ok: false, status: 500, statusText: 'Internal Server Error', text: async () => 'database failure' });
  const handler = loadHandler();
  const response = await handler(event({ bookingId: 'booking-1', token: token() }));
  assert.equal(response.statusCode, 404);
  assert.doesNotMatch(response.body, /database failure/);
});
