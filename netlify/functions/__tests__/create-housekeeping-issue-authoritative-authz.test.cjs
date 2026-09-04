const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
let handler;
let calls;

function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '1h', ...options }); }
function token({ employeeId = 'emp-1', staffRole = 'housekeeper', businessId = 'biz-1' } = {}) {
  return sign({ sub: employeeId, role: 'authenticated', user_metadata: { business_id: businessId, employee_id: employeeId, staff_role: staffRole } });
}
function event(jwtToken, body = {}, method = 'POST') {
  return { httpMethod: method, headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) };
}
function response(status, data = []) {
  return { ok: status >= 200 && status < 300, status, async json() { return data; }, async text() { return typeof data === 'string' ? data : JSON.stringify(data); } };
}

const BASE = {
  sessionId: 'session-1', taskId: 'task-1', roomId: 'room-1',
  checklistItemId: 'bathroom-1', checklistItemLabel: 'Bathroom', category: 'bathroom', issueType: 'Damage',
};

before(async () => { ({ handler } = await import('../create-housekeeping-issue.js?test=create-housekeeping-issue-authz')); });
beforeEach(() => {
  calls = [];
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u, options });
    if (u.includes('/employees?')) return response(200, [{ id: 'emp-1', business_id: 'biz-1', status: 'Active' }]);
    if (u.includes('/housekeeping_service_sessions?')) return response(200, [{ id: 'session-1', employee_id: 'emp-1', housekeeping_task_id: 'task-1', room_id: 'room-1', status: 'active' }]);
    if (u.includes('/housekeeping_tasks?')) return response(200, [{ id: 'task-1', room_id: 'room-1', room_number: 1 }]);
    if (u.includes('/housekeeping_issues')) return response(201, [{ id: 'issue-1', business_id: 'biz-1' }]);
    return response(404, []);
  };
});
after(() => { delete global.fetch; });

test('employee may create an issue only for the task attached to their active session', async () => {
  const r = await handler(event(token(), BASE));
  assert.equal(r.statusCode, 201);
  const issueCall = calls.find((c) => c.url.includes('/housekeeping_issues'));
  assert.ok(issueCall);
  const payload = JSON.parse(issueCall.options.body);
  assert.equal(payload.housekeeping_task_id, 'task-1');
  assert.equal(payload.room_id, 'room-1');
});

test('employee cannot attach issue to another task in the same tenant', async () => {
  const r = await handler(event(token(), { ...BASE, taskId: 'task-2' }));
  assert.equal(r.statusCode, 403);
  assert.equal(calls.filter((c) => c.url.includes('/housekeeping_issues')).length, 0);
});

test('employee cannot attach issue to another room in the same tenant', async () => {
  const r = await handler(event(token(), { ...BASE, roomId: 'room-2' }));
  assert.equal(r.statusCode, 403);
  assert.equal(calls.filter((c) => c.url.includes('/housekeeping_issues')).length, 0);
});

test('malformed JSON is rejected without database access after authentication', async () => {
  const r = await handler(event(token(), '{not-json'));
  assert.equal(r.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('wrong HTTP method is rejected', async () => {
  const r = await handler(event(null, {}, 'GET'));
  assert.equal(r.statusCode, 405);
  assert.equal(calls.length, 0);
});
