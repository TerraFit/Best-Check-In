const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
const SECRET = process.env.SUPABASE_JWT_SECRET;

function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: '15m' }); }
function businessToken(id = 'biz-a') { return sign({ sub: `owner-${id}`, user_metadata: { business_id: id } }); }
function employeeToken(id = 'biz-a', permissions = ['canViewDashboard']) { return sign({ sub: `emp-${id}`, user_metadata: { business_id: id, employee_id: `emp-${id}`, permission_set: permissions } }); }
function platformToken(role = 'platform_operations') { return sign({ sub: `platform-${role}`, platform_role: role }); }
function event(method, token, queryStringParameters = {}, body = undefined) { return { httpMethod: method, headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }; }
async function load(name) { return import(`../${name}.js?test=${Date.now()}-${Math.random()}`); }
function mockFetch(responses = []) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const next = responses.shift() || { body: [] };
    return { ok: next.ok !== false, status: next.status || 200, json: async () => next.body ?? [], text: async () => JSON.stringify(next.body ?? []) };
  };
  return calls;
}

test('get-notifications: anonymous request is rejected', async () => {
  const { handler } = await load('get-notifications');
  assert.equal((await handler(event('GET', null))).statusCode, 401);
});

test('get-notifications: employee cannot substitute user identity', async () => {
  const { handler } = await load('get-notifications');
  assert.equal((await handler(event('GET', employeeToken(), { userType: 'business', userId: 'biz-a' }))).statusCode, 403);
});

test('get-notifications: employee queries are bound to employee identity', async () => {
  const calls = mockFetch([{ body: [] }, { body: [] }]);
  const { handler } = await load('get-notifications');
  assert.equal((await handler(event('GET', employeeToken('biz-a'), { userType: 'employee', userId: 'emp-biz-a' }))).statusCode, 200);
  assert.match(calls[0].url, /user_type=eq\.employee/);
  assert.match(calls[0].url, /user_id=eq\.emp-biz-a/);
});

test('mark-notification-read: employee cannot mark business notification as read', async () => {
  const calls = mockFetch();
  const { handler } = await load('mark-notification-read');
  assert.equal((await handler(event('PATCH', employeeToken(), {}, { notificationId: 'notif-1' }))).statusCode, 200);
  assert.match(calls[0].url, /user_type=eq\.employee/);
  assert.match(calls[0].url, /user_id=eq\.emp-biz-a/);
  assert.doesNotMatch(calls[0].url, /user_type=eq\.business/);
});

test('delete-notification: employee mutation is bound to employee identity', async () => {
  const calls = mockFetch();
  const { handler } = await load('delete-notification');
  assert.equal((await handler(event('DELETE', employeeToken(), {}, { notificationId: 'notif-1' }))).statusCode, 200);
  assert.match(calls[0].url, /user_type=eq\.employee/);
  assert.match(calls[0].url, /user_id=eq\.emp-biz-a/);
  assert.doesNotMatch(calls[0].url, /user_type=eq\.business/);
});

test('delete-notification: platform finance is denied', async () => {
  const { handler } = await load('delete-notification');
  assert.equal((await handler(event('DELETE', platformToken('platform_finance'), {}, { notificationId: 'notif-1' }))).statusCode, 403);
});
