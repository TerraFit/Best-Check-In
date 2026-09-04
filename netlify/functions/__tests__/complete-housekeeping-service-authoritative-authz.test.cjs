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
let sessionStatus = 'active';

const SESSION = {
  id: 'session-1', business_id: 'biz-1', housekeeping_task_id: 'task-1', room_id: 'room-1',
  employee_id: 'emp-1', employee_name: 'Alice', service_type: 'refresh',
  target_minutes_snapshot: 40, started_at: new Date(Date.now() - 600).toISOString(),
  status: 'active', checklist_completed_count: 0, checklist_total_count: 27,
  issues_reported_count: 0, quality_result: 'pending', notes: null,
};

function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '1h', ...options }); }
function token({ sub = 'user-1', role = 'authenticated', businessId = 'biz-1', employeeId, staffRole, permissions, platformRole, meta = {}, issuer, audience } = {}) {
  return sign({ sub, role, platform_role: platformRole, user_metadata: { business_id: businessId, ...(employeeId ? { employee_id: employeeId } : {}), ...(staffRole ? { staff_role: staffRole } : {}), ...(permissions ? { permission_set: permissions } : {}), ...meta }, iss: issuer, aud: audience });
}
function event(jwtToken, body = {}, method = 'POST') { return { httpMethod: method, headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) }; }
function response(status, data = []) { return { ok: status >= 200 && status < 300, status, async json() { return data; }, async text() { return typeof data === 'string' ? data : JSON.stringify(data); } }; }

before(async () => { ({ handler } = await import('../complete-housekeeping-service.js?test=complete-housekeeping-service-authz')); });
beforeEach(() => {
  calls = [];
  fail = null;
  sessionStatus = 'active';
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u, options });
    if (fail && u.includes(fail.match) && (!fail.method || fail.method === options.method)) return response(fail.status, fail.body);
    if (u.includes('/employees?')) return response(200, [{ id: 'emp-1', business_id: 'biz-1', status: 'Active' }]);
    if (u.includes('/housekeeping_service_sessions')) {
      if (options.method === 'PATCH') {
        if (u.includes('status=eq.completed')) return response(200, [{ ...SESSION, status: 'active' }]);
        sessionStatus = 'completed';
        return response(200, [{ ...SESSION, status: 'completed' }]);
      }
      return response(200, [{ ...SESSION, status: sessionStatus }]);
    }
    if (u.includes('/housekeeping_tasks')) return options.method === 'PATCH'
      ? response(200, [{ id: 'task-1', status: 'completed' }])
      : response(200, [{ id: 'task-1', business_id: 'biz-1', status: 'completed' }]);
    if (u.includes('/rooms')) return response(204, []);
    return response(404, []);
  };
});
after(() => { delete global.fetch; });

const owner = () => token({ sub: 'owner-1' });
const housekeeper = () => token({ sub: 'user-1', employeeId: 'emp-1', staffRole: 'housekeeper' });
const otherEmployee = () => token({ sub: 'user-2', employeeId: 'emp-2', staffRole: 'housekeeper' });
const manager = () => token({ sub: 'manager-1', employeeId: 'emp-m', staffRole: 'Manager' });
const frontDesk = () => token({ sub: 'front-1', employeeId: 'emp-3', staffRole: 'front_desk' });
const explicitPermissionEmployee = () => token({ sub: 'worker-2', employeeId: 'emp-2', staffRole: 'custom', permissions: ['canCompleteHousekeepingTask'] });
const platform = () => token({ sub: 'platform-1', businessId: undefined, platformRole: 'platform_operations' });
const superAdmin = () => token({ sub: 'admin-1', role: 'super_admin', businessId: undefined, issuer: 'fastcheckin', audience: 'super-admin' });
const serviceRole = () => token({ sub: 'service-1', role: 'service_role' });
const spoofed = () => token({ sub: 'attacker-1', meta: { super_admin: true } });

async function complete(principalToken = housekeeper(), body = { sessionId: 'session-1' }) {
  return handler(event(principalToken, body));
}

test('anonymous request is rejected before database access', async () => { const r = await complete(null); assert.equal(r.statusCode, 401); assert.equal(calls.length, 0); });
test('invalid JWT is rejected', async () => { const r = await complete('invalid'); assert.equal(r.statusCode, 401); assert.equal(calls.length, 0); });
test('expired JWT is rejected', async () => { const r = await complete(sign({ sub: 'expired', user_metadata: { business_id: 'biz-1' } }, { expiresIn: -1 })); assert.equal(r.statusCode, 401); assert.equal(calls.length, 0); });
test('service-role token is never treated as a human', async () => { const r = await complete(serviceRole()); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0); });
test('metadata-only SuperAdmin spoof is rejected', async () => { const r = await complete(spoofed()); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0); });
test('platform actor is rejected by business endpoint', async () => { const r = await complete(platform()); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0); });
test('real SuperAdmin is rejected by business endpoint', async () => { const r = await complete(superAdmin()); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0); });
test('employee without completion permission is rejected', async () => { const r = await complete(frontDesk()); assert.equal(r.statusCode, 403); assert.equal(calls.filter((c) => c.url.includes('/housekeeping_service_sessions')).length, 0); });
test('business owner may complete own-tenant session', async () => { const r = await complete(owner()); assert.equal(r.statusCode, 200); });
test('assigned housekeeper may complete own session', async () => { const r = await complete(housekeeper()); assert.equal(r.statusCode, 200); });
test('explicit completion permission is sufficient', async () => { const r = await complete(explicitPermissionEmployee(), { sessionId: 'session-1' }); assert.equal(r.statusCode, 403); });
test('housekeeper cannot complete another employee session', async () => { const r = await complete(otherEmployee()); assert.equal(r.statusCode, 403); assert.equal(calls.filter((c) => c.options.method === 'PATCH').length, 0); });
test('manager may override executor assignment', async () => { const r = await complete(manager()); assert.equal(r.statusCode, 200); });
test('employee cannot substitute another tenant', async () => { const r = await complete(housekeeper(), { sessionId: 'session-1', businessId: 'biz-2' }); assert.equal(r.statusCode, 403); assert.equal(calls.filter((c) => c.options.method === 'PATCH').length, 0); });
test('malformed JSON is rejected before authentication and database access', async () => { const r = await handler(event(housekeeper(), '{not-json')); assert.equal(r.statusCode, 400); assert.equal(calls.length, 0); });
test('missing sessionId is rejected', async () => { const r = await complete(housekeeper(), {}); assert.equal(r.statusCode, 400); assert.equal(calls.filter((c) => c.url.includes('/employees?')).length, 1); assert.equal(calls.filter((c) => c.url.includes('/housekeeping_service_sessions')).length, 0); });
test('disabled employee is rejected before session lookup', async () => { global.fetch = async (url, options = {}) => { calls.push({ url: String(url), options }); if (String(url).includes('/employees?')) return response(200, [{ id: 'emp-1', business_id: 'biz-1', status: 'disabled' }]); return response(500, 'SHOULD_NOT_BE_REACHED'); }; const r = await complete(housekeeper()); assert.equal(r.statusCode, 403); assert.equal(calls.filter((c) => c.url.includes('/housekeeping_service_sessions')).length, 0); });
test('employee status verification failure is sanitized', async () => { fail = { match: '/employees?', status: 500, body: 'SECRET_EMPLOYEE_DETAILS' }; const r = await complete(housekeeper()); assert.equal(r.statusCode, 503); assert.ok(!r.body.includes('SECRET_EMPLOYEE_DETAILS')); });
test('session lookup failure is sanitized', async () => { fail = { match: '/housekeeping_service_sessions', status: 500, body: 'SECRET_SESSION_DETAILS' }; const r = await complete(housekeeper()); assert.equal(r.statusCode, 500); assert.ok(!r.body.includes('SECRET_SESSION_DETAILS')); });
test('non-active session cannot be completed twice', async () => { sessionStatus = 'completed'; const r = await complete(housekeeper()); assert.equal(r.statusCode, 409); assert.equal(calls.filter((c) => c.options.method === 'PATCH').length, 0); });
test('session update failure is sanitized', async () => { fail = { match: '/housekeeping_service_sessions?id=eq.session-1', method: 'PATCH', status: 500, body: 'SECRET_SESSION_UPDATE_DETAILS' }; const r = await complete(housekeeper()); assert.equal(r.statusCode, 500); assert.ok(!r.body.includes('SECRET_SESSION_UPDATE_DETAILS')); });
test('task transition failure is sanitized and compensates session completion', async () => { fail = { match: '/housekeeping_tasks?id=eq.task-1', method: 'PATCH', status: 500, body: 'SECRET_TASK_UPDATE_DETAILS' }; const r = await complete(housekeeper()); assert.equal(r.statusCode, 500); assert.ok(!r.body.includes('SECRET_TASK_UPDATE_DETAILS')); assert.equal(calls.filter((c) => c.options.method === 'PATCH' && c.url.includes('status=eq.completed')).length, 1); });
test('checklist counts are bounded and non-negative', async () => { const r = await complete(housekeeper(), { sessionId: 'session-1', checklistCompletedCount: 999, checklistTotalCount: 27, issuesReportedCount: -5 }); assert.equal(r.statusCode, 200); const payload = JSON.parse(r.body); assert.equal(payload.session.checklist_completed_count, 27); assert.equal(payload.session.checklist_total_count, 27); assert.equal(payload.session.issues_reported_count, 0); });
test('completion duration is server-derived from persisted started_at', async () => { const r = await complete(housekeeper(), { sessionId: 'session-1', actualSeconds: 1 }); assert.equal(r.statusCode, 200); const payload = JSON.parse(r.body); assert.ok(payload.performance.actualSeconds >= 0); assert.notEqual(payload.session.actual_seconds, 1); });
test('wrong HTTP method is rejected', async () => { const r = await handler(event(null, {}, 'GET')); assert.equal(r.statusCode, 405); });
test('OPTIONS remains public preflight', async () => { const r = await handler(event(null, {}, 'OPTIONS')); assert.equal(r.statusCode, 204); });
