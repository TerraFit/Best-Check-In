const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

const { handler } = await import('../update-booking-stay.js');

const BOOKING_ID = 'booking-1';
const TENANT_A = 'business-a';
const TENANT_B = 'business-b';
const EMPLOYEE_ID = 'employee-1';

const baseBooking = {
  id: BOOKING_ID,
  guest_name: 'Guest One',
  business_id: TENANT_A,
  check_in_date: '2026-09-10',
  check_out_date: '2026-09-12',
  nights: 2,
};

function token(payload = {}) {
  return jwt.sign({
    sub: payload.sub || 'user-1',
    role: payload.role || 'authenticated',
    email: payload.email || 'owner@example.com',
    user_metadata: {
      business_id: payload.businessId || TENANT_A,
      ...(payload.employeeId ? { employee_id: payload.employeeId } : {}),
      ...(payload.staffRole ? { staff_role: payload.staffRole } : {}),
      ...(payload.permissions ? { permission_set: payload.permissions } : {}),
      ...(payload.metadataRole ? { role: payload.metadataRole } : {}),
    },
  }, process.env.SUPABASE_JWT_SECRET, { expiresIn: '1h' });
}

function event({ auth, body, method = 'POST' } = {}) {
  return {
    httpMethod: method,
    headers: {
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
      'user-agent': 'test-agent',
    },
    body: body === undefined ? JSON.stringify({ bookingId: BOOKING_ID, check_in_date: '2026-09-10', nights: 2 }) : JSON.stringify(body),
  };
}

function response(status, body, ok = status >= 200 && status < 300) {
  return { ok, status, async json() { return body; }, async text() { return typeof body === 'string' ? body : JSON.stringify(body); } };
}

function installFetch({ booking = baseBooking, updateResult = null, bookingStatus = 200, updateStatus = 200, updateBody, capture } = {}) {
  global.fetch = async (url, options = {}) => {
    if (capture) capture.push({ url, options });
    if (url.includes('/bookings?id=eq.') && options.method === 'PATCH') {
      return response(updateStatus, updateBody ?? (updateResult ? [updateResult] : []), updateStatus < 300);
    }
    if (url.includes('/bookings?id=eq.')) {
      return response(bookingStatus, bookingStatus < 300 ? [booking] : { error: 'SECRET database details' }, bookingStatus < 300);
    }
    if (url.includes('/audit_logs')) return response(201, {});
    throw new Error(`Unexpected fetch: ${url}`);
  };
}

test('1. anonymous request is rejected before database access', async () => {
  let called = false;
  global.fetch = async () => { called = true; throw new Error('database must not be reached'); };
  const result = await handler(event());
  assert.equal(result.statusCode, 401);
  assert.equal(called, false);
});

test('2. invalid JWT is rejected', async () => {
  global.fetch = async () => { throw new Error('database must not be reached'); };
  const result = await handler(event({ auth: 'not-a-token' }));
  assert.equal(result.statusCode, 401);
});

test('3. expired JWT is rejected', async () => {
  const expired = jwt.sign({ sub: 'user-1', role: 'authenticated', user_metadata: { business_id: TENANT_A } }, process.env.SUPABASE_JWT_SECRET, { expiresIn: -1 });
  global.fetch = async () => { throw new Error('database must not be reached'); };
  const result = await handler(event({ auth: expired }));
  assert.equal(result.statusCode, 401);
});

test('4. employee without canManageBookings is rejected', async () => {
  global.fetch = async () => { throw new Error('database must not be reached'); };
  const result = await handler(event({ auth: token({ employeeId: EMPLOYEE_ID, permissions: ['canViewDashboard'] }) }));
  assert.equal(result.statusCode, 403);
});

test('5. employee cannot substitute another tenant', async () => {
  global.fetch = async () => { throw new Error('database must not be reached'); };
  const result = await handler(event({
    auth: token({ employeeId: EMPLOYEE_ID, permissions: ['canManageBookings'] }),
    body: { bookingId: BOOKING_ID, business_id: TENANT_B, check_in_date: '2026-09-10', nights: 2 },
  }));
  assert.equal(result.statusCode, 403);
});

test('6. platform actor is rejected from business mutation', async () => {
  global.fetch = async () => { throw new Error('database must not be reached'); };
  const result = await handler(event({ auth: token({ role: 'authenticated', businessId: null }) }));
  assert.equal(result.statusCode, 403);
});

test('7. service-role token is rejected', async () => {
  const service = jwt.sign({ sub: 'service', role: 'service_role', platform_role: 'super_admin', user_metadata: {} }, process.env.SUPABASE_JWT_SECRET);
  global.fetch = async () => { throw new Error('database must not be reached'); };
  const result = await handler(event({ auth: service }));
  assert.equal(result.statusCode, 403);
});

test('8. metadata-only super-admin spoof is rejected', async () => {
  const spoof = token({ metadataRole: 'super_admin' });
  global.fetch = async () => { throw new Error('database must not be reached'); };
  const result = await handler(event({ auth: spoof }));
  assert.equal(result.statusCode, 403);
});

test('9. business owner can update only within authenticated tenant', async () => {
  const capture = [];
  installFetch({ updateResult: { ...baseBooking, check_in_date: '2026-09-11', check_out_date: '2026-09-14', nights: 3 }, capture });
  const result = await handler(event({
    auth: token(),
    body: { bookingId: BOOKING_ID, business_id: TENANT_A, check_in_date: '2026-09-11', nights: 3, check_out_date: '2099-01-01' },
  }));
  assert.equal(result.statusCode, 200);
  const update = capture.find(x => x.options.method === 'PATCH' && x.url.includes('/bookings'));
  assert.ok(update);
  assert.match(update.url, /business_id=eq\.business-a/);
  const patch = JSON.parse(update.options.body);
  assert.equal(patch.check_in_date, '2026-09-11');
  assert.equal(patch.nights, 3);
  assert.equal(patch.check_out_date, '2026-09-14');
  assert.notEqual(patch.check_out_date, '2099-01-01');
});

test('10. authorized employee is tenant-bound and client business_id is not trusted', async () => {
  const capture = [];
  installFetch({ updateResult: { ...baseBooking, check_in_date: '2026-09-11', check_out_date: '2026-09-13', nights: 2 }, capture });
  const result = await handler(event({
    auth: token({ employeeId: EMPLOYEE_ID, permissions: ['canManageBookings'] }),
    body: { bookingId: BOOKING_ID, business_id: TENANT_A, check_in_date: '2026-09-11', nights: 2 },
  }));
  assert.equal(result.statusCode, 200);
  const bookingGet = capture.find(x => x.options.method === undefined && x.url.includes('/bookings'));
  const update = capture.find(x => x.options.method === 'PATCH' && x.url.includes('/bookings'));
  assert.match(bookingGet.url, /business_id=eq\.business-a/);
  assert.match(update.url, /business_id=eq\.business-a/);
});

test('11. booking from another tenant is not readable or mutable', async () => {
  const capture = [];
  installFetch({ booking: { ...baseBooking, business_id: TENANT_B }, capture });
  const result = await handler(event({ auth: token(), body: { bookingId: BOOKING_ID, check_in_date: '2026-09-11', nights: 2 } }));
  assert.equal(result.statusCode, 404);
  assert.equal(capture.some(x => x.options.method === 'PATCH'), false);
});

test('12. missing booking is 404 and no mutation occurs', async () => {
  const capture = [];
  installFetch({ booking: null, capture });
  const result = await handler(event({ auth: token() }));
  assert.equal(result.statusCode, 404);
  assert.equal(capture.some(x => x.options.method === 'PATCH'), false);
});

test('13. malformed JSON is rejected', async () => {
  global.fetch = async () => { throw new Error('database must not be reached'); };
  const result = await handler({ ...event({ auth: token() }), body: '{not-json' });
  assert.equal(result.statusCode, 400);
});

test('14. database failure is sanitized', async () => {
  global.fetch = async (url) => url.includes('/bookings') ? response(500, 'SECRET database failure details', false) : response(201, {});
  const result = await handler(event({ auth: token() }));
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /SECRET database failure details/);
});

test('15. derived checkout cannot be supplied by client', async () => {
  const capture = [];
  installFetch({ updateResult: { ...baseBooking, check_in_date: '2026-09-15', check_out_date: '2026-09-19', nights: 4 }, capture });
  const result = await handler(event({ auth: token(), body: { bookingId: BOOKING_ID, check_in_date: '2026-09-15', nights: 4, check_out_date: '2026-09-16' } }));
  assert.equal(result.statusCode, 200);
  const update = capture.find(x => x.options.method === 'PATCH' && x.url.includes('/bookings'));
  assert.equal(JSON.parse(update.options.body).check_out_date, '2026-09-19');
});

test('16. wrong HTTP method is rejected', async () => {
  global.fetch = async () => { throw new Error('database must not be reached'); };
  const result = await handler(event({ method: 'GET', auth: token() }));
  assert.equal(result.statusCode, 405);
});

test('17. OPTIONS remains public preflight', async () => {
  const result = await handler(event({ method: 'OPTIONS' }));
  assert.equal(result.statusCode, 204);
});
