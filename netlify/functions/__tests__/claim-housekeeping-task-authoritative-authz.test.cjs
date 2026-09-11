const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
let handler;
let calls;
let fail;
let taskAssigned = false;

function sign(payload, options = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h', ...options });
}

function token({ sub = 'user-1', role = 'authenticated', businessId = 'biz-1', employeeId, staffRole, permissions, platformRole, meta = {}, issuer, audience } = {}) {
  return sign({
    sub,
    role,
    platform_role: platformRole,
    user_metadata: {
      business_id: businessId,
      ...(employeeId ? { employee_id: employeeId } : {}),
      ...(staffRole ? { staff_role: staffRole } : {}),
      ...(permissions ? { permission_set: permissions } : {}),
      ...meta,
    },
    iss: issuer,
    aud: audience,
  });
}

function event(jwtToken, body = {}, method = 'POST') {
  return {
    httpMethod: method,
    headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function response(status, data = []) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; },
    async text() { return typeof data === 'string' ? data : JSON.stringify(data); },
  };
}

before(async () => {
  ({ handler } = await import('../claim-housekeeping-task.js?test=claim-housekeeping-task-authz'));
});

beforeEach(() => {
  calls = [];
  fail = null;
  taskAssigned = false;
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u, options });

    if (fail && u.includes(fail.match) && (!fail.method || fail.method === options.method)) {
      return response(fail.status, fail.body);
    }

    if (u.includes('/employees?')) {
      const employeeId = decodeURIComponent((u.match(/id=eq\\.([^&]+)/) || [])[1] || 'emp-1');
      return response(200, [{ id: employeeId, business_id: 'biz-1', status: 'Active' }]);
    }

    if (u.includes('/housekeeping_tasks')) {
      if (options.method !== 'PATCH') return response(200, []);
      if (taskAssigned || !u.includes('assigned_staff_id=is.null') || !u.includes('status=eq.pending')) {
        return response(200, []);
      }
      taskAssigned = true;
      return response(200, [{
        id: 'task-1', business_id: 'biz-1', status: 'pending', assigned_staff_id: 'emp-1', assigned_staff_name: 'Alice',
      }]);
    }

    return response(404, []);
  };
});

after(() => { delete global.fetch; });

const housekeeper = () => token({ sub: 'user-1', employeeId: 'emp-1', staffRole: 'housekeeper' });
const otherEmployee = () => token({ sub: 'user-2', employeeId: 'emp-2', staffRole: 'housekeeper' });
const manager = () => token({ sub: 'manager-1', employeeId: 'emp-m', staffRole: 'Manager' });
const explicitPermissionEmployee = () => token({ sub: 'worker-2', employeeId: 'emp-2', staffRole: 'custom', permissions: ['canStartHousekeepingTask'] });
const noExecutePermission = () => token({ sub: 'front-1', employeeId: 'emp-3', staffRole: 'front_desk' });
const owner = () => token({ sub: 'owner-1' });
const platform = () => token({ sub: 'platform-1', businessId: undefined, platformRole: 'platform_operations' });
const superAdmin = () => token({ sub: 'admin-1', role: 'super_admin', businessId: undefined, issuer: 'fastcheckin', audience: 'super-admin' });
const serviceRole = () => token({ sub: 'service-1', role: 'service_role' });
const spoofed = () => token({ sub: 'attacker-1', meta: { super_admin: true } });

async function claim(principalToken = housekeeper(), body = { taskId: 'task-1' }) {
  return handler(event(principalToken, body));
}

test('anonymous request is rejected before database access', async () => {
  const r = await claim(null);
  assert.equal(r.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('invalid JWT is rejected before database access', async () => {
  const r = await claim('invalid');
  assert.equal(r.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('expired JWT is rejected before database access', async () => {
  const r = await claim(sign({ sub: 'expired', user_metadata: { business_id: 'biz-1', employee_id: 'emp-1', staff_role: 'housekeeper' } }, { expiresIn: -1 }));
  assert.equal(r.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('service-role token is never treated as a human employee', async () => {
  const r = await claim(serviceRole());
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('metadata-only SuperAdmin spoof is rejected', async () => {
  const r = await claim(spoofed());
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('platform actor is rejected by business endpoint', async () => {
  const r = await claim(platform());
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('real SuperAdmin is rejected by business endpoint', async () => {
  const r = await claim(superAdmin());
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('business owner cannot claim because claiming requires an employee principal', async () => {
  const r = await claim(owner());
  assert.equal(r.statusCode, 403);
  assert.equal(calls.filter((c) => c.url.includes('/housekeeping_tasks')).length, 0);
});

test('employee without housekeeping execution permission is rejected', async () => {
  const r = await claim(noExecutePermission());
  assert.equal(r.statusCode, 403);
  assert.equal(calls.filter((c) => c.url.includes('/housekeeping_tasks')).length, 0);
});

test('assigned employee may claim an unassigned pending task', async () => {
  const r = await claim(housekeeper());
  assert.equal(r.statusCode, 200);
  assert.equal(calls.filter((c) => c.options.method === 'PATCH').length, 1);
  assert.match(calls.find((c) => c.options.method === 'PATCH').url, /business_id=eq\.biz-1/);
  assert.match(calls.find((c) => c.options.method === 'PATCH').url, /assigned_staff_id=is\.null/);
  assert.match(calls.find((c) => c.options.method === 'PATCH').url, /status=eq\.pending/);
  const payload = JSON.parse(calls.find((c) => c.options.method === 'PATCH').options.body);
  assert.equal(payload.assigned_staff_id, 'emp-1');
});

test('manager may claim a task through the execution gate', async () => {
  const r = await claim(manager());
  assert.equal(r.statusCode, 200);
  const payload = JSON.parse(calls.find((c) => c.options.method === 'PATCH').options.body);
  assert.equal(payload.assigned_staff_id, 'emp-m');
});

test('explicit start permission is sufficient to claim', async () => {
  const r = await claim(explicitPermissionEmployee());
  assert.equal(r.statusCode, 200);
});

test('employee cannot substitute another tenant', async () => {
  const r = await claim(housekeeper(), { taskId: 'task-1', businessId: 'biz-2' });
  assert.equal(r.statusCode, 403);
  assert.equal(calls.filter((c) => c.url.includes('/housekeeping_tasks')).length, 0);
});

test('taskId is required before authentication and database access', async () => {
  const r = await claim(housekeeper(), {});
  assert.equal(r.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('malformed JSON is rejected before authentication and database access', async () => {
  const r = await handler(event(housekeeper(), '{not-json'));
  assert.equal(r.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('employee status verification failure is sanitized', async () => {
  fail = { match: '/employees?', status: 500, body: 'SECRET_EMPLOYEE_DETAILS' };
  const r = await claim(housekeeper());
  assert.equal(r.statusCode, 503);
  assert.ok(!r.body.includes('SECRET_EMPLOYEE_DETAILS'));
  assert.equal(calls.filter((c) => c.url.includes('/housekeeping_tasks')).length, 0);
});

test('disabled employee is rejected before task lookup', async () => {
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/employees?')) return response(200, [{ id: 'emp-1', business_id: 'biz-1', status: 'disabled' }]);
    return response(500, 'SHOULD_NOT_BE_REACHED');
  };
  const r = await claim(housekeeper());
  assert.equal(r.statusCode, 403);
  assert.equal(calls.filter((c) => c.url.includes('/housekeeping_tasks')).length, 0);
});

test('employee from another tenant is rejected before task lookup', async () => {
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/employees?')) return response(200, [{ id: 'emp-1', business_id: 'biz-2', status: 'Active' }]);
    return response(500, 'SHOULD_NOT_BE_REACHED');
  };
  const r = await claim(housekeeper());
  assert.equal(r.statusCode, 403);
  assert.equal(calls.filter((c) => c.url.includes('/housekeeping_tasks')).length, 0);
});

test('task claim failure does not expose upstream details', async () => {
  fail = { match: '/housekeeping_tasks?', method: 'PATCH', status: 500, body: 'SECRET_TASK_DETAILS' };
  const r = await claim(housekeeper());
  assert.equal(r.statusCode, 500);
  assert.ok(!r.body.includes('SECRET_TASK_DETAILS'));
});

test('already claimed task returns conflict and does not overwrite assignment', async () => {
  taskAssigned = true;
  const r = await claim(housekeeper());
  assert.equal(r.statusCode, 409);
  assert.equal(r.body.includes('TASK_ALREADY_CLAIMED'), true);
  const patch = calls.find((c) => c.options.method === 'PATCH');
  assert.ok(patch);
  assert.match(patch.url, /assigned_staff_id=is\.null/);
});

test('claim is concurrency-safe through the conditional unassigned predicate', async () => {
  const first = await claim(housekeeper());
  const second = await claim(otherEmployee());
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 409);
  assert.equal(calls.filter((c) => c.options.method === 'PATCH').length, 2);
});

test('wrong HTTP method is rejected', async () => {
  const r = await handler(event(null, {}, 'GET'));
  assert.equal(r.statusCode, 405);
  assert.equal(calls.length, 0);
});

test('OPTIONS remains public preflight', async () => {
  const r = await handler(event(null, {}, 'OPTIONS'));
  assert.equal(r.statusCode, 204);
  assert.equal(calls.length, 0);
});
