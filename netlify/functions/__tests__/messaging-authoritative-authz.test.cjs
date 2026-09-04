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
function event(method, token, queryStringParameters = {}) { return { httpMethod: method, headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters }; }
async function load(name) { return import(`../${name}.js?test=${Date.now()}-${Math.random()}`); }

function mockFetch(routes = []) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    const call = { url: String(url), options };
    calls.push(call);
    const route = routes.find((r) => String(url).includes(r.match));
    if (!route) return { ok: true, status: 200, json: async () => [], text: async () => '' };
    return { ok: route.ok !== false, status: route.status || (route.ok === false ? 500 : 200), json: async () => route.body ?? [], text: async () => typeof route.body === 'string' ? route.body : JSON.stringify(route.body ?? []) };
  };
  return calls;
}

test('get-conversations: anonymous request is rejected', async () => { const { handler } = await load('get-conversations'); assert.equal((await handler(event('GET', null))).statusCode, 401); });
test('get-conversations: employee cannot substitute another tenant', async () => { const { handler } = await load('get-conversations'); assert.equal((await handler(event('GET', employeeToken(), { businessId: 'biz-b' }))).statusCode, 403); });
test('get-conversations: authorized business is tenant scoped', async () => { const calls = mockFetch([{ match: '/rest/v1/conversations?', body: [] }]); const { handler } = await load('get-conversations'); assert.equal((await handler(event('GET', businessToken(), { businessId: 'biz-a' }))).statusCode, 200); assert.match(calls[0].url, /business_id=eq\.biz-a/); });
test('get-conversations: platform finance is denied', async () => { const { handler } = await load('get-conversations'); assert.equal((await handler(event('GET', platformToken('platform_finance'))).statusCode), 403); });
test('get-messages: conversation tenant is authoritative', async () => { const calls = mockFetch([{ match: '/rest/v1/conversations?', body: [{ id: 'conv-1', business_id: 'biz-b' }] }]); const { handler } = await load('get-messages'); assert.equal((await handler(event('GET', businessToken('biz-a'), { conversationId: 'conv-1' }))).statusCode, 403); assert.equal(calls.length, 1); });
test('get-messages: authorized conversation is readable only inside tenant', async () => { const calls = mockFetch([{ match: '/rest/v1/conversations?', body: [{ id: 'conv-1', business_id: 'biz-a' }] }, { match: '/rest/v1/messages?', body: [{ id: 'msg-1', conversation_id: 'conv-1' }] }]); const { handler } = await load('get-messages'); assert.equal((await handler(event('GET', employeeToken('biz-a'), { conversationId: 'conv-1' }))).statusCode, 200); assert.match(calls[1].url, /conversation_id=eq\.conv-1/); });
test('send-message: conversation tenant cannot be substituted', async () => { const calls = mockFetch([{ match: '/rest/v1/conversations?', body: [{ id: 'conv-1', business_id: 'biz-b' }] }]); const { handler } = await load('send-message'); const result = await handler(event('POST', employeeToken('biz-a'), {})); assert.equal(result.statusCode, 400); const result2 = await handler({ ...event('POST', employeeToken('biz-a')), body: JSON.stringify({ conversationId: 'conv-1', message: 'hello' }) }); assert.equal(result2.statusCode, 403); assert.equal(calls.length, 1); });
test('send-message: new conversation is bound to authenticated tenant', async () => { const calls = mockFetch([{ match: '/rest/v1/conversations', body: [{ id: 'conv-new' }] }, { match: '/rest/v1/messages', body: [{ id: 'msg-new', conversation_id: 'conv-new' }] }]); const { handler } = await load('send-message'); const result = await handler({ ...event('POST', employeeToken('biz-a')), body: JSON.stringify({ businessId: 'biz-a', message: 'hello' }) }); assert.equal(result.statusCode, 200); const createCall = calls.find((c) => c.options.method === 'POST' && c.url.includes('/rest/v1/conversations')); assert.ok(createCall); assert.match(createCall.options.body, /biz-a/); });
test('send-message: cross-tenant new conversation is rejected', async () => { const { handler } = await load('send-message'); const result = await handler({ ...event('POST', employeeToken('biz-a')), body: JSON.stringify({ businessId: 'biz-b', message: 'hello' }) }); assert.equal(result.statusCode, 403); });
