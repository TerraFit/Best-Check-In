const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

let handler;
let calls;

function sign({ role = 'authenticated', businessId = 'biz-1', employeeId, staffRole, permissions } = {}) {
  return jwt.sign({
    sub: employeeId || 'user-1',
    role,
    user_metadata: {
      business_id: businessId,
      ...(employeeId ? { employee_id: employeeId } : {}),
      ...(staffRole ? { staff_role: staffRole } : {}),
      ...(permissions ? { permission_set: permissions } : {}),
    },
  }, process.env.SUPABASE_JWT_SECRET, { expiresIn: '1h' });
}

function event(token, body) {
  return {
    httpMethod: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  };
}

before(async () => {
  ({ handler } = await import('../update-housekeeping-task.js?test=privilege-escalation'));
});

beforeEach(() => {
  calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      async json() { return [{ id: 'task-1', business_id: 'biz-1', room_id: 'room-1', assigned_staff_id: 'emp-1', status: 'pending' }]; },
      async text() { return ''; },
    };
  };
});

after(() => { delete global.fetch; });

const frontDesk = () => sign({ employeeId: 'emp-front', staffRole: 'front_desk' });
const housekeeper = () => sign({ employeeId: 'emp-1', staffRole: 'housekeeper' });


test('view-only employee cannot mutate task status to pending', async () => {
  const r = await handler(event(frontDesk(), { taskId: 'task-1', status: 'pending' }));
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('view-only employee cannot mutate task notes', async () => {
  const r = await handler(event(frontDesk(), { taskId: 'task-1', notes: 'unauthorized change' }));
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('executor cannot smuggle assignment into an authorized completion update', async () => {
  const r = await handler(event(housekeeper(), {
    taskId: 'task-1',
    status: 'completed',
    assigned_staff_id: 'emp-attacker',
    assigned_staff_name: 'Attacker',
  }));
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('executor cannot smuggle inspection approval into an authorized completion update', async () => {
  const r = await handler(event(housekeeper(), {
    taskId: 'task-1',
    status: 'completed',
    inspection_status: 'approved',
  }));
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('executor cannot assign and change status in the same request without assignment permission', async () => {
  const r = await handler(event(housekeeper(), {
    taskId: 'task-1',
    status: 'in_progress',
    assigned_staff_id: null,
    assigned_staff_name: null,
  }));
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});
