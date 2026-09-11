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

const SESSION = { id: 'session-1', business_id: 'biz-1', employee_id: 'emp-1', status: 'active', checklist_state: {}, checklist_completed_count: 0, checklist_total_count: 10, issues_reported_count: 0 };

function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '1h', ...options }); }
function token({ sub = 'user-1', role = 'authenticated', businessId = 'biz-1', employeeId, staffRole, permissions, platformRole, meta = {}, issuer, audience } = {}) {
  return sign({ sub, role, platform_role: platformRole, user_metadata: { business_id: businessId, ...(employeeId ? { employee_id: employeeId } : {}), ...(staffRole ? { staff_role: staffRole } : {}), ...(permissions ? { permission_set: permissions } : {}), ...meta }, iss: issuer, aud: audience });
}
function event(jwtToken, body = {}, method = 'POST') { return { httpMethod: method, headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) }; }
function response(status, data = []) { return { ok: status >= 200 && status < 300, status, async json() { return data; }, async text() { return typeof data === 'string' ? data : JSON.stringify(data); } }; }

before(async () => { ({ handler } = await import('../update-housekeeping-service-progress.js?test=update-housekeeping-service-progress-authz-v2')); });
beforeEach(() => {
  calls = [];
  fail = null;
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u, options });
    if (fail && u.includes(fail.match) && (!fail.method || fail.method === options.method)) return response(fail.status, fail.body);
    if (u.includes('/employees?')) return response(200, [{ id: 'emp-1', business_id: 'biz-1', status: 'Active' }]);
    if (u.includes('/housekeeping_service_sessions?')) {
      if (options.method === 'PATCH') return response(200, [{ ...SESSION, checklist_state: { bathroom: true }, checklist_completed_count: 1, updated_at: new Date().toISOString() }]);
      return response(200, [SESSION]);
    }
    return response(404, []);
  };
});
after(() => { delete global.fetch; });

const owner = () => token({ sub: 'owner-1' });
const housekeeper = () => token({ sub: 'user-1', employeeId: 'emp-1', staffRole: 'housekeeper' });
const otherEmployee = () => token({ sub: 'user-2', employeeId: 'emp-2', staffRole: 'housekeeper' });
const manager = () => token({ sub: 'manager-1', employeeId: 'emp-m', staffRole: 'Manager' });
const explicitPermission = () => token({ sub: 'perm-1', employeeId: 'emp-2', staffRole: 'custom', permissions: ['canViewHousekeeping', 'canCompleteHousekeepingTask'] });
const frontDesk = () => token({ sub: 'front-1', employeeId: 'emp-3', staffRole: 'front_desk' });
const platform = () => token({ sub: 'platform-1', businessId: undefined, platformRole: 'platform_operations' });
const superAdmin = () => token({ sub: 'admin-1', role: 'super_admin', businessId: undefined, issuer: 'fastcheckin', audience: 'super-admin' });
const serviceRole = () => token({ sub: 'service-1', role: 'service_role' });
const spoofed = () => token({ sub: 'attacker-1', meta: { super_admin: true } });

const body = { sessionId: 'session-1', checklistState: { bathroom: true }, checklistCompletedCount: 1, checklistTotalCount: 10, issuesReportedCount: 0, notes: 'Progress saved' };

test('anonymous request is rejected before database access', async () => { const r = await handler(event(null, body)); assert.equal(r.statusCode, 401); assert.equal(calls.length, 0); });
test('invalid JWT is rejected', async () => { const r = await handler(event('invalid', body)); assert.equal(r.statusCode, 401); assert.equal(calls.length, 0); });
test('expired JWT is rejected', async () => { const r = await handler(event(sign({ sub: 'expired', user_metadata: { business_id: 'biz-1', employee_id: 'emp-1', staff_role: 'housekeeper' } }, { expiresIn: -1 }), body)); assert.equal(r.statusCode, 401); });
test('service-role token is never treated as a human', async () => { const r = await handler(event(serviceRole(), body)); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0); });
test('metadata-only SuperAdmin spoof is rejected', async () => { const r = await handler(event(spoofed(), body)); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0); });
test('platform actor is rejected by business endpoint', async () => { const r = await handler(event(platform(), body)); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0); });
test('real SuperAdmin is rejected by business endpoint', async () => { const r = await handler(event(superAdmin(), { ...body, businessId: 'biz-1' })); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0); });
test('employee without housekeeping execution permission is rejected', async () => { const r = await handler(event(frontDesk(), body)); assert.equal(r.statusCode, 403); assert.equal(calls.length, 0); });
test('business owner may update own-tenant session', async () => { const r = await handler(event(owner(), { ...body, businessId: 'biz-1' })); assert.equal(r.statusCode, 200); });
test('assigned housekeeper may update own session', async () => { const r = await handler(event(housekeeper(), body)); assert.equal(r.statusCode, 200); });
test('housekeeper cannot update another employee session', async () => { const r = await handler(event(otherEmployee(), body)); assert.equal(r.statusCode, 403); assert.equal(calls.filter((c) => c.options.method === 'PATCH').length, 0); });
test('manager may override executor assignment', async () => { const r = await handler(event(manager(), body)); assert.equal(r.statusCode, 200); });
test('explicit completion permission does not permit cross-session progress update', async () => { const r = await handler(event(explicitPermission(), body)); assert.equal(r.statusCode, 403); assert.equal(calls.filter((c) => c.options.method === 'PATCH').length, 0); });
test('employee cannot substitute another tenant', async () => { const r = await handler(event(housekeeper(), { ...body, businessId: 'biz-2' })); assert.equal(r.statusCode, 403); assert.equal(calls.length, 1); });
test('malformed JSON is rejected before authentication and database access', async () => { const r = await handler(event(housekeeper(), '{not-json')); assert.equal(r.statusCode, 400); assert.equal(calls.length, 0); });
test('missing sessionId is rejected', async () => { const r = await handler(event(housekeeper(), { checklistState: {} })); assert.equal(r.statusCode, 400); assert.equal(calls.filter((c) => c.url.includes('housekeeping_service_sessions')).length, 0); });
test('disabled employee is rejected before session lookup', async () => { global.fetch = async (url, options = {}) => { calls.push({ url: String(url), options }); if (String(url).includes('/employees?')) return response(200, [{ id: 'emp-1', business_id: 'biz-1', status: 'Disabled' }]); return response(500, 'SHOULD_NOT_REACH_SESSION'); }; const r = await handler(event(housekeeper(), body)); assert.equal(r.statusCode, 403); assert.equal(calls.filter((c) => c.url.includes('housekeeping_service_sessions')).length, 0); });
test('employee status verification failure is sanitized', async () => { fail = { match: '/employees?', status: 500, body: 'SECRET_EMPLOYEE_DETAILS' }; const r = await handler(event(housekeeper(), body)); assert.equal(r.statusCode, 503); assert.ok(!r.body.includes('SECRET_EMPLOYEE_DETAILS')); });
test('session lookup failure is sanitized', async () => { fail = { match: '/housekeeping_service_sessions?', status: 500, body: 'SECRET_SESSION_DETAILS' }; const r = await handler(event(housekeeper(), body)); assert.equal(r.statusCode, 500); assert.ok(!r.body.includes('SECRET_SESSION_DETAILS')); });
test('inactive session cannot be updated', async () => { global.fetch = async (url, options = {}) => { calls.push({ url: String(url), options }); if (String(url).includes('/employees?')) return response(200, [{ id: 'emp-1', business_id: 'biz-1', status: 'Active' }]); if (String(url).includes('housekeeping_service_sessions?')) return response(200, []); return response(404, []); }; const r = await handler(event(housekeeper(), body)); assert.equal(r.statusCode, 404); });
test('session update failure is sanitized', async () => { fail = { match: '/housekeeping_service_sessions?', method: 'PATCH', status: 500, body: 'SECRET_UPDATE_DETAILS' }; const r = await handler(event(housekeeper(), body)); assert.equal(r.statusCode, 500); assert.ok(!r.body.includes('SECRET_UPDATE_DETAILS')); });
test('checklist counts are bounded and non-negative', async () => { const r = await handler(event(housekeeper(), { ...body, checklistCompletedCount: -5, checklistTotalCount: -2, issuesReportedCount: -8 })); assert.equal(r.statusCode, 200); const patch = calls.find((c) => c.options.method === 'PATCH'); const sent = JSON.parse(patch.options.body); assert.equal(sent.checklist_completed_count, 0); assert.equal(sent.checklist_total_count, 0); assert.equal(sent.issues_reported_count, 0); });
test('notes are optional and checklist state is persisted server-side', async () => { const r = await handler(event(housekeeper(), { sessionId: 'session-1', checklistState: { room: true }, checklistCompletedCount: 2, checklistTotalCount: 10 })); assert.equal(r.statusCode, 200); const patch = calls.find((c) => c.options.method === 'PATCH'); const sent = JSON.parse(patch.options.body); assert.deepEqual(sent.checklist_state, { room: true }); assert.equal(Object.prototype.hasOwnProperty.call(sent, 'notes'), false); assert.ok(sent.updated_at); });
test('wrong HTTP method is rejected', async () => { const r = await handler(event(null, body, 'GET')); assert.equal(r.statusCode, 405); });
test('OPTIONS remains public preflight', async () => { const r = await handler(event(null, {}, 'OPTIONS')); assert.equal(r.statusCode, 204); });
