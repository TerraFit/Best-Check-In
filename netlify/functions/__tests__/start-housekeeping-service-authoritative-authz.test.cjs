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

const TASK = { id: 'task-1', business_id: 'biz-1', room_id: 'room-1', assigned_staff_id: 'emp-1', assigned_staff_name: 'Alice', task_type: 'refresh', is_checkout: false, status: 'pending', booking_id: 'booking-1' };
const ROOM = { id: 'room-1', room_type: 'standard', room_name: 'Stone', room_number: '1' };

function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '1h', ...options }); }
function token({ sub = 'user-1', role = 'authenticated', businessId = 'biz-1', employeeId, staffRole, permissions, platformRole, meta = {}, issuer, audience } = {}) {
  return sign({ sub, role, platform_role: platformRole, user_metadata: { business_id: businessId, ...(employeeId ? { employee_id: employeeId } : {}), ...(staffRole ? { staff_role: staffRole } : {}), ...(permissions ? { permission_set: permissions } : {}), ...meta }, iss: issuer, aud: audience });
}
function event(jwtToken, body = {}, method = 'POST') { return { httpMethod: method, headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) }; }
function response(status, data = []) { return { ok: status >= 200 && status < 300, status, async json() { return data; }, async text() { return typeof data === 'string' ? data : JSON.stringify(data); } }; }

before(async () => { ({ handler } = await import('../start-housekeeping-service.js?test=start-housekeeping-service-authz')); });
beforeEach(() => {
  calls = [];
  fail = null;
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u, options });
    if (fail && u.includes(fail.match)) return response(fail.status, fail.body);
    if (u.includes('/employees?')) return response(200, [{ id: 'emp-1', business_id: 'biz-1', status: 'Active' }]);
    if (u.includes('/housekeeping_tasks?id=eq.task-1')) return options.method === 'PATCH' ? response(200, [{ ...TASK, status: 'in_progress' }]) : response(200, [TASK]);
    if (u.includes('/rooms?id=eq.room-1')) return response(200, [ROOM]);
    if (u.includes('/housekeeping_service_settings?')) return response(200, [{ warning_minutes: 15, final_countdown_seconds: 5, voice_enabled: true, sound_enabled: true }]);
    if (u.includes('/housekeeping_service_targets?')) return response(200, [{ service_type: 'refresh', room_type: 'standard', target_minutes: 40 }]);
    if (u.includes('/housekeeping_service_sessions')) return response(201, [{ id: 'session-1', business_id: 'biz-1', housekeeping_task_id: 'task-1', room_id: 'room-1', status: 'active' }]);
    return response(404, []);
  };
});
after(() => { delete global.fetch; });

const owner = () => token({ sub: 'owner-1' });
const housekeeper = () => token({ sub: 'user-1', employeeId: 'emp-1', staffRole: 'housekeeper' });
const otherEmployee = () => token({ sub: 'user-2', employeeId: 'emp-2', staffRole: 'housekeeper' });
const manager = () => token({ sub: 'manager-1', employeeId: 'emp-m', staffRole: 'Manager' });
const noHousekeepingPermission = () => token({ sub: 'front-1', employeeId: 'emp-3', staffRole: 'front_desk' });
const platform = () => token({ sub: 'platform-1', businessId: undefined, platformRole: 'platform_operations' });
const superAdmin = () => token({ sub: 'admin-1', role: 'super_admin', businessId: undefined, issuer: 'fastcheckin', audience: 'super-admin' });
const serviceRole = () => token({ sub: 'service-1', role: 'service_role' });
const spoofed = () => token({ sub: 'attacker-1', meta: { super_admin: true } });


test('anonymous request is rejected before database access', async () => { const r = await handler(event(null)); assert.equal(r.statusCode, 401); assert.equal(calls.length, 0); });
test('invalid JWT is rejected', async () => { const r = await handler(event('invalid')); assert.equal(r.statusCode, 401); assert.equal(calls.length, 0); });
test('expired JWT is rejected', async () => { const r = await handler(event(sign({ sub: 'expired', user_metadata: { business_id: 'biz-1' } }, { expiresIn: -1 }))); assert.equal(r.statusCode, 401); });
test('service-role token is never treated as a human', async () => { const r = await handler(event(serviceRole(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 403); });
test('metadata-only SuperAdmin spoof is rejected', async () => { const r = await handler(event(spoofed(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 403); });
test('platform actor is rejected by business endpoint', async () => { const r = await handler(event(platform(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 403); });
test('real SuperAdmin is rejected by business endpoint', async () => { const r = await handler(event(superAdmin(), { taskId: 'task-1', serviceType: 'refresh', businessId: 'biz-1' })); assert.equal(r.statusCode, 403); });
test('employee without housekeeping permission is rejected', async () => { const r = await handler(event(noHousekeepingPermission(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 403); });
test('business owner may start own-tenant task', async () => { const r = await handler(event(owner(), { taskId: 'task-1', serviceType: 'refresh', businessId: 'biz-1' })); assert.equal(r.statusCode, 200); });
test('assigned housekeeper may start task', async () => { const r = await handler(event(housekeeper(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 200); });
test('housekeeper cannot start another employee task', async () => { const r = await handler(event(otherEmployee(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 403); assert.equal(calls.filter((c) => c.options.method === 'POST' && c.url.includes('housekeeping_service_sessions')).length, 0); });
test('manager may override task assignment', async () => { const r = await handler(event(manager(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 200); });
test('employee cannot substitute another tenant', async () => { const r = await handler(event(housekeeper(), { taskId: 'task-1', serviceType: 'refresh', businessId: 'biz-2' })); assert.equal(r.statusCode, 403); });
test('malformed JSON is rejected before database access', async () => { const r = await handler(event(housekeeper(), '{not-json')); assert.equal(r.statusCode, 400); assert.equal(calls.length, 0); });
test('task lookup failure is sanitized', async () => { fail = { match: '/housekeeping_tasks?id=eq.task-1', status: 500, body: 'SECRET_DATABASE_DETAILS' }; const r = await handler(event(housekeeper(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 500); assert.ok(!r.body.includes('SECRET_DATABASE_DETAILS')); });
test('room lookup failure is sanitized', async () => { fail = { match: '/rooms?id=eq.room-1', status: 500, body: 'SECRET_ROOM_DETAILS' }; const r = await handler(event(housekeeper(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 500); assert.ok(!r.body.includes('SECRET_ROOM_DETAILS')); });
test('session creation failure is sanitized', async () => { fail = { match: '/housekeeping_service_sessions', status: 500, body: 'SECRET_SESSION_DETAILS' }; const r = await handler(event(housekeeper(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 500); assert.ok(!r.body.includes('SECRET_SESSION_DETAILS')); });
test('task transition failure is sanitized', async () => { fail = { match: '/housekeeping_tasks?id=eq.task-1', status: 500, body: 'SECRET_TASK_UPDATE_DETAILS' }; const r = await handler(event(housekeeper(), { taskId: 'task-1', serviceType: 'refresh' })); assert.equal(r.statusCode, 500); assert.ok(!r.body.includes('SECRET_TASK_UPDATE_DETAILS')); });
test('wrong HTTP method is rejected', async () => { const r = await handler(event(null, {}, 'GET')); assert.equal(r.statusCode, 405); });
test('OPTIONS remains public preflight', async () => { const r = await handler(event(null, {}, 'OPTIONS')); assert.equal(r.statusCode, 204); });
