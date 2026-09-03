const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';
process.env.SUPER_ADMIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPER_ADMIN_JWT_AUDIENCE = 'super-admin';

let handler;
let calls;

const TASK = {
  id: 'task-1',
  business_id: 'biz-1',
  room_id: 'room-1',
  assigned_staff_id: 'emp-1',
  assigned_staff_name: 'Alice',
  task_type: 'refresh',
  is_checkout: false,
  status: 'pending',
  inspection_status: 'pending',
  booking_id: 'booking-1',
  guest_name: 'Guest',
};

function token({ role = 'authenticated', sub = 'user-1', businessId = 'biz-1', employeeId, staffRole, permissions, platformRole, issuer, audience, meta = {} } = {}) {
  const user_metadata = {
    business_id: businessId,
    ...(employeeId ? { employee_id: employeeId } : {}),
    ...(staffRole ? { staff_role: staffRole } : {}),
    ...(permissions ? { permission_set: permissions } : {}),
    ...meta,
  };
  return jwt.sign({ sub, role, platform_role: platformRole, user_metadata, iss: issuer, aud: audience }, process.env.SUPABASE_JWT_SECRET, { expiresIn: '1h' });
}

function event(body, authorization, method = 'POST') {
  return { httpMethod: method, headers: authorization ? { Authorization: `Bearer ${authorization}` } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) };
}

function response(status, data = {}) {
  return { ok: status >= 200 && status < 300, status, async json() { return data; }, async text() { return typeof data === 'string' ? data : JSON.stringify(data); } };
}

before(async () => {
  ({ handler } = await import('../update-housekeeping-task.js?test=update-housekeeping-task-authz'));
});

beforeEach(() => {
  calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/housekeeping_tasks?id=eq.task-1') && !options.method) return response(200, [TASK]);
    if (String(url).includes('/housekeeping_tasks?id=eq.task-1') && options.method === 'PATCH') return response(200, [{ ...TASK, ...(JSON.parse(options.body || '{}')) }]);
    if (String(url).includes('/employees')) return response(200, [{ id: 'emp-2', business_id: 'biz-1', status: 'Active' }]);
    if (String(url).includes('/rooms?')) return response(204, []);
    if (String(url).includes('/room_events')) return response(201, []);
    return response(404, []);
  };
});

after(() => { delete global.fetch; });

const ownEmployee = () => token({ sub: 'user-1', employeeId: 'emp-1', staffRole: 'housekeeper' });
const otherEmployee = () => token({ sub: 'user-2', employeeId: 'emp-2', staffRole: 'housekeeper' });
const manager = () => token({ sub: 'manager-1', employeeId: 'emp-m', staffRole: 'Manager' });
const owner = () => token({ sub: 'owner-1' });
const platform = () => token({ sub: 'platform-1', businessId: undefined, platformRole: 'platform_operations' });
const superAdmin = () => token({ sub: 'admin-1', role: 'super_admin', businessId: undefined, issuer: 'fastcheckin', audience: 'super-admin' });
const serviceRole = () => token({ sub: 'service-1', role: 'service_role' });
const spoofedSuperAdmin = () => token({ sub: 'attacker-1', meta: { super_admin: true } });


test('anonymous request is rejected before database access', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress' }));
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('invalid JWT is rejected', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress' }, 'not-a-jwt'));
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('expired JWT is rejected', async () => {
  const expired = jwt.sign({ sub: 'user-1', role: 'authenticated', user_metadata: { business_id: 'biz-1', employee_id: 'emp-1', staff_role: 'housekeeper' } }, process.env.SUPABASE_JWT_SECRET, { expiresIn: -1 });
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress' }, expired));
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('service-role token cannot become a SuperAdmin', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress' }, serviceRole()));
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('metadata-only SuperAdmin spoof is rejected', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress' }, spoofedSuperAdmin()));
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('platform actor is rejected from business housekeeping mutation', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress', businessId: 'biz-1' }, platform()));
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('SuperAdmin is rejected from business housekeeping mutation', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress', businessId: 'biz-1' }, superAdmin()));
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('business owner may execute a housekeeping task in its own tenant', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress', businessId: 'biz-1' }, owner()));
  assert.equal(res.statusCode, 200);
  assert.match(calls[0].url, /business_id=eq\.biz-1/);
});

test('employee may start its own assigned task', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress', businessId: 'biz-1' }, ownEmployee()));
  assert.equal(res.statusCode, 200);
  assert.match(calls[0].url, /business_id=eq\.biz-1/);
});

test('employee cannot execute another employee task', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'completed', businessId: 'biz-1' }, otherEmployee()));
  assert.equal(res.statusCode, 403);
  assert.equal(calls.filter((c) => c.options.method === 'PATCH').length, 0);
});

test('manager can override another employee task', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'completed', businessId: 'biz-1' }, manager()));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.filter((c) => c.options.method === 'PATCH' && c.url.includes('/housekeeping_tasks')).length, 1);
});

test('employee cannot substitute another tenant', async () => {
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress', businessId: 'biz-2' }, ownEmployee()));
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('inspection approval requires approval authority', async () => {
  const res = await handler(event({ taskId: 'task-1', inspection_status: 'approved', businessId: 'biz-1' }, ownEmployee()));
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('manager can approve an inspection', async () => {
  const res = await handler(event({ taskId: 'task-1', inspection_status: 'approved', businessId: 'biz-1' }, manager()));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.filter((c) => c.options.method === 'PATCH' && c.url.includes('/housekeeping_tasks')).length, 1);
});

test('assignment requires assignment authority', async () => {
  const res = await handler(event({ taskId: 'task-1', assigned_staff_id: 'emp-2', assigned_staff_name: 'Bob', businessId: 'biz-1' }, ownEmployee()));
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('manager may assign only an employee from the authenticated tenant', async () => {
  const res = await handler(event({ taskId: 'task-1', assigned_staff_id: 'emp-2', assigned_staff_name: 'Bob', businessId: 'biz-1' }, manager()));
  assert.equal(res.statusCode, 200);
  const patchCall = calls.find((c) => c.options.method === 'PATCH' && c.url.includes('/housekeeping_tasks'));
  assert.deepEqual(JSON.parse(patchCall.options.body).assigned_staff_id, 'emp-2');
});

test('malformed JSON is rejected without database access', async () => {
  const res = await handler(event('{not-json', ownEmployee()));
  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('task lookup failure is sanitized', async () => {
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return response(500, 'SECRET_DATABASE_DETAILS');
  };
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress' }, ownEmployee()));
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(res.body, /SECRET_DATABASE_DETAILS/);
});

test('task update failure is sanitized', async () => {
  let first = true;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (first && !options.method) { first = false; return response(200, [TASK]); }
    return response(500, 'SECRET_UPDATE_DETAILS');
  };
  const res = await handler(event({ taskId: 'task-1', status: 'in_progress' }, ownEmployee()));
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(res.body, /SECRET_UPDATE_DETAILS/);
});

test('wrong method is rejected', async () => {
  const res = await handler(event({ taskId: 'task-1' }, ownEmployee(), 'GET'));
  assert.equal(res.statusCode, 405);
  assert.equal(calls.length, 0);
});

test('OPTIONS remains public preflight', async () => {
  const res = await handler(event('', null, 'OPTIONS'));
  assert.equal(res.statusCode, 204);
  assert.equal(calls.length, 0);
});
