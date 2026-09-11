const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: '15m' }); }
function businessToken(businessId = 'biz-a') {
  return sign({ sub: `owner-${businessId}`, user_metadata: { business_id: businessId } });
}
function employeeToken(businessId = 'biz-a') {
  return sign({ sub: `emp-${businessId}`, user_metadata: { business_id: businessId, employee_id: `emp-${businessId}`, staff_role: 'EmployeeOverview', permission_set: [] } });
}
function event(token, body) {
  return { httpMethod: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) };
}
async function loadFunction() { return import(`../create-audit-log.js?test=${Date.now()}-${Math.random()}`); }
function mockFetch() {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => [{ id: 'log-1', business_id: 'biz-a', user_id: 'owner-biz-a', action: 'check_in' }], text: async () => '' };
  };
  return calls;
}

test('audit creation: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, { business_id: 'biz-a', action: 'check_in' }));
  assert.equal(result.statusCode, 401);
});

test('audit creation: service-role JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({ role: 'service_role', sub: 'service' });
  const result = await handler(event(token, { business_id: 'biz-a', action: 'check_in' }));
  assert.equal(result.statusCode, 403);
});

test('audit creation: metadata super-admin spoof is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({ sub: 'spoof', user_metadata: { business_id: 'biz-a', super_admin: true } });
  const result = await handler(event(token, { business_id: 'biz-a', action: 'check_in' }));
  assert.equal(result.statusCode, 403);
});

test('audit creation: employee cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { business_id: 'biz-b', action: 'check_in' }));
  assert.equal(result.statusCode, 403);
});

test('audit creation: client cannot spoof user identity or role', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), {
    business_id: 'biz-a',
    user_id: 'attacker',
    user_name: 'Attacker',
    user_role: 'super_admin',
    action: 'check_in'
  }));
  assert.equal(result.statusCode, 200);
  const inserted = JSON.parse(calls[0].options.body)[0];
  assert.equal(inserted.business_id, 'biz-a');
  assert.equal(inserted.user_id, 'emp-biz-a');
  assert.equal(inserted.user_name, 'emp-biz-a');
  assert.equal(inserted.user_role, 'EmployeeOverview');
});

test('audit creation: authorized business actor can create a tenant-scoped log', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken('biz-a'), { business_id: 'biz-a', action: 'check_in', details: { source: 'dashboard' } }));
  assert.equal(result.statusCode, 200);
  const inserted = JSON.parse(calls[0].options.body)[0];
  assert.equal(inserted.business_id, 'biz-a');
  assert.equal(inserted.user_id, 'owner-biz-a');
});
