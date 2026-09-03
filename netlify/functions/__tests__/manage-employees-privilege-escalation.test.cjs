const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
const SECRET = process.env.SUPABASE_JWT_SECRET;

function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: '15m' }); }
function event(method, token, body) {
  return { httpMethod: method, headers: token ? { authorization: `Bearer ${token}` } : {}, body: body === undefined ? undefined : JSON.stringify(body) };
}
function employeeToken(role = 'Supervisor', permissions = ['canManageStaff'], employeeId = 'emp-supervisor') {
  return sign({ sub: employeeId, user_metadata: { business_id: 'biz-a', employee_id: employeeId, staff_role: role, permission_set: permissions } });
}
function businessToken() { return sign({ sub: 'owner-biz-a', user_metadata: { business_id: 'biz-a' } }); }
async function loadFunction() { return import(`../manage-employees.js?test=${Date.now()}-${Math.random()}`); }
function mockFetch(ok = true) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok, status: ok ? 200 : 500, json: async () => [{ id: 'emp-2', business_id: 'biz-a', full_name: 'Employee' }], text: async () => 'database failure' };
  };
  return calls;
}

function newEmployeeBody(overrides = {}) {
  return { full_name: 'New Employee', phone_number: '+27 82 123 4567', ...overrides };
}

test('staff escalation: employee cannot assign a higher role', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('PATCH', employeeToken(), { id: 'emp-2', staff_role: 'Manager' }));
  assert.equal(result.statusCode, 403);
});

test('staff escalation: employee cannot grant permissions they do not have', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('PATCH', employeeToken(), { id: 'emp-2', permission_set: ['canManageStaff', 'canManageSettings'] }));
  assert.equal(result.statusCode, 403);
});

test('staff escalation: employee cannot elevate own role', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('PATCH', employeeToken(), { id: 'emp-supervisor', staff_role: 'Manager' }));
  assert.equal(result.statusCode, 403);
});

test('staff escalation: employee cannot elevate own permissions', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('PATCH', employeeToken(), { id: 'emp-supervisor', permission_set: ['canManageStaff', 'canManageSettings'] }));
  assert.equal(result.statusCode, 403);
});

test('staff escalation: employee may assign a lower role', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event('PATCH', employeeToken(), { id: 'emp-2', staff_role: 'Team Leader' }));
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.role, 'Team Leader');
  assert.equal(body.staff_role, 'Team Leader');
});

test('staff escalation: employee may assign only a subset of own permissions', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const permissions = ['canManageStaff', 'canViewRooms'];
  const result = await handler(event('PATCH', employeeToken('Supervisor', permissions), { id: 'emp-2', permission_set: permissions }));
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(calls[0].options.body).permission_set, permissions);
});

test('staff escalation: unsupported privileged role is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('PATCH', businessToken(), { id: 'emp-2', staff_role: 'super_admin' }));
  assert.equal(result.statusCode, 403);
});

test('staff escalation: unsupported arbitrary role is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('PATCH', businessToken(), { id: 'emp-2', staff_role: 'not-a-real-role' }));
  assert.equal(result.statusCode, 403);
});

test('staff escalation: employee cannot create a higher-role employee', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('POST', employeeToken(), newEmployeeBody({ staff_role: 'Manager' })));
  assert.equal(result.statusCode, 403);
});

test('staff escalation: employee cannot create an employee with permissions they do not have', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('POST', employeeToken(), newEmployeeBody({ permission_set: ['canManageStaff', 'canManageSettings'] })));
  assert.equal(result.statusCode, 403);
});

test('staff escalation: database failure does not leak raw details', async () => {
  mockFetch(false);
  const { handler } = await loadFunction();
  const result = await handler(event('PATCH', businessToken(), { id: 'emp-2', status: 'Active' }));
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /database failure/i);
});
