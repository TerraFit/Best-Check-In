const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
const SECRET = process.env.SUPABASE_JWT_SECRET;

function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: '15m' }); }
function employeeToken(id = 'biz-a', permissions = ['canViewDashboard']) {
  return sign({ sub: `emp-${id}`, user_metadata: { business_id: id, employee_id: `emp-${id}`, permission_set: permissions } });
}
function event(token, body) {
  return { httpMethod: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) };
}
async function load() { return import(`../mark-message-read.js?test=${Date.now()}-${Math.random()}`); }

function mockFetch(routes = []) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const route = routes.find((r) => String(url).includes(r.match));
    if (!route) return { ok: true, status: 200, json: async () => [], text: async () => '' };
    return { ok: route.ok !== false, status: route.status || (route.ok === false ? 500 : 200), json: async () => route.body ?? [], text: async () => JSON.stringify(route.body ?? []) };
  };
  return calls;
}

test('mark-message-read: anonymous request is rejected', async () => {
  const { handler } = await load();
  const result = await handler(event(null, { conversationId: 'conv-1', readerType: 'business' }));
  assert.equal(result.statusCode, 401);
});

test('mark-message-read: conversation tenant is authoritative', async () => {
  mockFetch([{ match: '/rest/v1/conversations?', body: [{ id: 'conv-1', business_id: 'biz-b' }] }]);
  const { handler } = await load();
  const result = await handler(event(employeeToken('biz-a'), { conversationId: 'conv-1', readerType: 'business' }));
  assert.equal(result.statusCode, 403);
});

test('mark-message-read: client readerType cannot elevate business actor', async () => {
  const calls = mockFetch([
    { match: '/rest/v1/conversations?', body: [{ id: 'conv-1', business_id: 'biz-a' }] },
    { match: '/rest/v1/messages?', body: [] },
    { match: '/rest/v1/conversations?id=', body: [] },
  ]);
  const { handler } = await load();
  const result = await handler(event(employeeToken('biz-a'), { conversationId: 'conv-1', readerType: 'admin' }));
  assert.equal(result.statusCode, 200);
  const messageCall = calls.find((call) => call.url.includes('/rest/v1/messages?'));
  assert.ok(messageCall);
  assert.match(messageCall.url, /sender_type=eq\.admin/);
});
