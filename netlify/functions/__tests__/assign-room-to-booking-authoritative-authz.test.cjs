const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '15m', ...options }); }
function eventWithToken(token, body) {
  return { httpMethod: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) };
}
function businessToken(businessId = 'biz-a') {
  return sign({ sub: `owner-${businessId}`, user_metadata: { business_id: businessId } });
}
function employeeToken(businessId = 'biz-a', permissions = ['canViewDashboard']) {
  return sign({ sub: `emp-${businessId}`, user_metadata: { business_id: businessId, employee_id: `emp-${businessId}`, staff_role: 'Manager', permission_set: permissions } });
}
async function loadFunction() { return import(`../assign-room-to-booking.js?test=${Date.now()}-${Math.random()}`); }

function mockSuccessfulAllocationFetch() {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rest/v1/bookings?id=eq.booking-1')) {
      if (options.method === 'PATCH') {
        return { ok: true, status: 200, json: async () => [{ id: 'booking-1', business_id: 'biz-a', room_id: 'room-1' }], text: async () => '' };
      }
      return { ok: true, status: 200, json: async () => [{ id: 'booking-1', business_id: 'biz-a', guest_name: 'Guest', room_id: null, check_in_date: '2026-09-02' }], text: async () => '' };
    }
    if (String(url).includes('/rest/v1/rooms?id=eq.room-1')) {
      return { ok: true, status: 200, json: async () => [{ id: 'room-1', business_id: 'biz-a', room_number: '1', room_name: 'Stone', active: true, availability_status: 'available' }], text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => [], text: async () => '' };
  };
  return calls;
}

test('assign-room-to-booking: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ bookingId: 'booking-1', roomId: 'room-1', businessId: 'biz-a' }) });
  assert.equal(result.statusCode, 401);
});

test('assign-room-to-booking: invalid JWT is rejected rather than failing open', async () => {
  const { handler } = await loadFunction();
  const result = await handler(eventWithToken('not-a-valid-jwt', { bookingId: 'booking-1', roomId: 'room-1', businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});

test('assign-room-to-booking: business owner cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  const result = await handler(eventWithToken(businessToken('biz-a'), { bookingId: 'booking-1', roomId: 'room-1', businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('assign-room-to-booking: employee without room allocation permission is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(eventWithToken(employeeToken('biz-a', ['canViewDashboard']), { bookingId: 'booking-1', roomId: 'room-1', businessId: 'biz-a' }));
  assert.equal(result.statusCode, 403);
});

test('assign-room-to-booking: authorized owner reaches tenant-scoped data layer', async () => {
  const calls = mockSuccessfulAllocationFetch();
  const { handler } = await loadFunction();
  const result = await handler(eventWithToken(businessToken('biz-a'), { bookingId: 'booking-1', roomId: 'room-1', businessId: 'biz-a' }));
  assert.equal(result.statusCode, 200);
  const bookingRead = calls.find((call) => call.url.includes('/rest/v1/bookings?id=eq.booking-1') && !call.options.method);
  const bookingWrite = calls.find((call) => call.url.includes('/rest/v1/bookings?id=eq.booking-1') && call.options.method === 'PATCH');
  assert.match(bookingRead.url, /business_id=eq\.biz-a/);
  assert.match(bookingWrite.url, /business_id=eq\.biz-a/);
});

test('assign-room-to-booking: booking returned outside resolved tenant is rejected', async () => {
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('/rest/v1/bookings')) {
      return { ok: true, status: 200, json: async () => [{ id: 'booking-1', business_id: 'biz-b', guest_name: 'Other Tenant' }], text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => [], text: async () => '' };
  };
  const { handler } = await loadFunction();
  const result = await handler(eventWithToken(businessToken('biz-a'), { bookingId: 'booking-1', roomId: null, businessId: 'biz-a' }));
  assert.equal(result.statusCode, 404);
});
