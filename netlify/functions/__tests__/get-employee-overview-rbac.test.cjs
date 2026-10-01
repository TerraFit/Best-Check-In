const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'employee-overview-test-secret';
process.env.FASTCHECKIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';
const EMPLOYEE_ID = '22222222-2222-2222-2222-222222222222';

function token({ role = 'housekeeper', department = null, additional_departments = [], permission_set = [] } = {}) {
  return jwt.sign({
    sub: EMPLOYEE_ID,
    role: 'employee',
    user_metadata: {
      business_id: BUSINESS_ID,
      employee_id: EMPLOYEE_ID,
      staff_role: role,
      department,
      additional_departments,
      permission_set,
      active: true,
    },
  }, process.env.SUPABASE_JWT_SECRET, { issuer: 'fastcheckin', expiresIn: '1h' });
}

function event(jwtToken, businessId = BUSINESS_ID) {
  return { httpMethod: 'GET', headers: { authorization: `Bearer ${jwtToken}` }, queryStringParameters: { businessId } };
}

async function loadHandler() { return (await import('../get-employee-overview.js')).handler; }

function installFetchMock() {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/booking_food_restrictions?')) {
      return { ok: true, status: 200, json: async () => [{ booking_id: 'booking-1', vegan: true, other_text: 'No coriander' }] };
    }
    return { ok: true, status: 200, json: async () => [{ id: 'booking-1', guest_name: 'Test Guest', guest_phone: '+27123456789', guest_country: 'South Africa', check_in_date: '2026-09-13', check_out_date: '2026-09-14', status: 'checked_in', room_id: 'room-1', room_number: '1', room_name: 'Stone Luxury Suite' }] };
  };
  return { calls, restore: () => { global.fetch = original; } };
}

async function invoke(options) {
  const mock = installFetchMock();
  try {
    const handler = await loadHandler();
    return { result: await handler(event(token(options))), calls: mock.calls };
  } finally { mock.restore(); }
}

function body(result) { return JSON.parse(result.body); }

test('maintenance employee is denied guest overview', async () => {
  const { result, calls } = await invoke({ role: 'maintenance', department: 'maintenance' });
  assert.equal(result.statusCode, 403);
  assert.equal(body(result).error, 'Missing permission: canViewGuestOverview');
  assert.equal(calls.length, 0);
});

test('housekeeper receives name, country and room but no phone or food restrictions', async () => {
  const { result, calls } = await invoke({ role: 'housekeeper', department: 'housekeeping' });
  const data = body(result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(data.capabilities, { guestOverview: true, guestPhone: false, foodRestrictions: false, frontDeskActions: false });
  assert.equal(data.arrivals[0].guest_name, 'Test Guest');
  assert.equal(data.arrivals[0].guest_country, 'South Africa');
  assert.equal(data.arrivals[0].room_number, '1');
  assert.equal('guest_phone' in data.arrivals[0], false);
  assert.equal('food_restrictions' in data.arrivals[0], false);
  assert.equal(calls.some((url) => url.includes('booking_food_restrictions')), false);
});

test('receptionist receives phone, food restrictions and front desk actions', async () => {
  const { result } = await invoke({ role: 'front_desk', department: 'front_office' });
  const data = body(result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(data.capabilities, { guestOverview: true, guestPhone: true, foodRestrictions: true, frontDeskActions: true });
  assert.equal(data.arrivals[0].guest_phone, '+27123456789');
  assert.equal(data.arrivals[0].food_restrictions.vegan, true);
  assert.equal(data.arrivals[0].food_restrictions.other_text, 'No coriander');
});

test('front office employee role receives room allocation and check-in permissions from department', async () => {
  const { result } = await invoke({ role: 'Employee (Legacy)', department: 'front_office' });
  const data = body(result);
  assert.equal(result.statusCode, 200);
  assert.equal(data.capabilities.frontDeskActions, true);
});

test('kitchen department receives food restrictions without phone or front desk actions', async () => {
  const { result } = await invoke({ role: 'Employee (Legacy)', department: 'kitchen' });
  const data = body(result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(data.capabilities, { guestOverview: true, guestPhone: false, foodRestrictions: true, frontDeskActions: false });
  assert.equal('guest_phone' in data.arrivals[0], false);
  assert.equal(data.arrivals[0].food_restrictions.vegan, true);
});

test('employee with kitchen as an additional department receives food restrictions', async () => {
  const { result } = await invoke({ role: 'housekeeper', department: 'housekeeping', additional_departments: ['kitchen'] });
  const data = body(result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(data.capabilities, { guestOverview: true, guestPhone: false, foodRestrictions: true, frontDeskActions: false });
  assert.equal('guest_phone' in data.arrivals[0], false);
  assert.equal(data.arrivals[0].food_restrictions.vegan, true);
});

test('cross-tenant employee request is rejected before data access', async () => {
  const mock = installFetchMock();
  try {
    const handler = await loadHandler();
    const result = await handler(event(token({ role: 'housekeeper', department: 'housekeeping' }), '99999999-9999-9999-9999-999999999999'));
    assert.equal(result.statusCode, 403);
    assert.equal(mock.calls.length, 0);
  } finally { mock.restore(); }
});

test('general manager in maintenance is denied guest overview', async () => {
  const { result } = await invoke({ role: 'general_manager', department: 'maintenance' });
  assert.equal(result.statusCode, 403);
});

test('Manager in front office receives guest and front desk permissions', async () => {
  const { result } = await invoke({ role: 'Manager', department: 'front_office' });
  const data = body(result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(data.capabilities, { guestOverview: true, guestPhone: true, foodRestrictions: true, frontDeskActions: true });
});

test('general manager in front office receives department guest permissions', async () => {
  const { result } = await invoke({ role: 'general_manager', department: 'front_office' });
  const data = body(result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(data.capabilities, { guestOverview: true, guestPhone: true, foodRestrictions: true, frontDeskActions: true });
});
