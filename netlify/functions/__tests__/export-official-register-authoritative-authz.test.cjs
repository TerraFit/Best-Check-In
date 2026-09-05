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
function serviceRoleToken() { return sign({ sub: 'service-role', role: 'service_role' }); }
function metadataSuperAdminToken() { return sign({ sub: 'spoof', user_metadata: { business_id: 'biz-a', role: 'super_admin', super_admin: true } }); }
function event(token, body = {}) { return { httpMethod: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) }; }
async function loadFunction() { return import(`../export-official-register.js?test=${Date.now()}-${Math.random()}`); }

test('official register: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  assert.equal((await handler(event(null))).statusCode, 401);
});

test('official register: service-role JWT is rejected', async () => {
  const { handler } = await loadFunction();
  assert.equal((await handler(event(serviceRoleToken()))).statusCode, 403);
});

test('official register: mutable metadata cannot grant super-admin access', async () => {
  const { handler } = await loadFunction();
  assert.equal((await handler(event(metadataSuperAdminToken()))).statusCode, 403);
});

test('official register: ordinary employee is denied before export processing', async () => {
  const { handler } = await loadFunction();
  assert.equal((await handler(event(employeeToken()))).statusCode, 403);
});

test('official register: business owner reaches explicit password authorization', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), { businessId: 'biz-a' }));
  assert.equal(result.statusCode, 401);
});
