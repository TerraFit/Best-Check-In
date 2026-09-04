const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
const SECRET = process.env.SUPABASE_JWT_SECRET;

function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: '15m' }); }
function businessToken(id = 'biz-a') { return sign({ sub: `owner-${id}`, user_metadata: { business_id: id } }); }
function employeeToken(id = 'biz-a', permissions = ['canManageSettings']) { return sign({ sub: `emp-${id}`, user_metadata: { business_id: id, employee_id: `emp-${id}`, permission_set: permissions } }); }
function platformToken(role = 'platform_operations') { return sign({ sub: `platform-${role}`, platform_role: role }); }
function event(token, businessId = 'biz-a') { return { httpMethod: 'GET', headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters: businessId === undefined ? {} : { businessId } }; }
async function loadFunction() { return import(`../get-newsletter-subscribers.ts?test=${Date.now()}-${Math.random()}`); }
function mockFetch(payload = []) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => payload, text: async () => JSON.stringify(payload) };
  };
  return calls;
}

test('newsletter subscribers: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  assert.equal((await handler(event(null))).statusCode, 401);
});

test('newsletter subscribers: employee cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  assert.equal((await handler(event(employeeToken(), 'biz-b'))).statusCode, 403);
});

test('newsletter subscribers: authorized employee query is tenant scoped', async () => {
  const calls = mockFetch([]);
  const { handler } = await loadFunction();
  assert.equal((await handler(event(employeeToken(), 'biz-a'))).statusCode, 200);
  assert.match(calls[0].url, /business_id=eq\.biz-a/);
});

test('newsletter subscribers: platform operations can request a tenant', async () => {
  const calls = mockFetch([]);
  const { handler } = await loadFunction();
  assert.equal((await handler(event(platformToken(), 'biz-b'))).statusCode, 200);
  assert.match(calls[0].url, /business_id=eq\.biz-b/);
});

test('newsletter subscribers: platform finance is denied', async () => {
  const { handler } = await loadFunction();
  assert.equal((await handler(event(platformToken('platform_finance'), 'biz-a'))).statusCode, 403);
});
