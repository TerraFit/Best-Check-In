const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
const SECRET = process.env.SUPABASE_JWT_SECRET;
function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: '15m' }); }
function event(token, businessId = 'biz-a') { return { httpMethod: 'GET', headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters: businessId === undefined ? {} : { businessId } }; }
function businessToken(id = 'biz-a') { return sign({ sub: `owner-${id}`, user_metadata: { business_id: id } }); }
function employeeToken(id = 'biz-a', permissions = ['canManageStaff']) { return sign({ sub: `emp-${id}`, user_metadata: { business_id: id, employee_id: `emp-${id}`, permission_set: permissions } }); }
function platformToken(role = 'platform_operations') { return sign({ sub: `platform-${role}`, platform_role: role }); }
function serviceRoleToken() { return sign({ sub: 'service-role', role: 'service_role' }); }
async function loadFunction() { return import(`../get-business-directors.js?test=${Date.now()}-${Math.random()}`); }
function mockFetch(payload = [{ name: 'Director', id_number: 'ID-1', id_photo_url: 'photo' }], ok = true, status = 200) { const calls = []; global.fetch = async (url, options = {}) => { calls.push({ url: String(url), options }); return { ok, status, json: async () => payload, text: async () => typeof payload === 'string' ? payload : JSON.stringify(payload) }; }; return calls; }

test('business directors: anonymous request is rejected', async () => { const { handler } = await loadFunction(); assert.equal((await handler(event(null))).statusCode, 401); });
test('business directors: invalid JWT is rejected', async () => { const { handler } = await loadFunction(); assert.equal((await handler(event('invalid'))).statusCode, 401); });
test('business directors: service-role JWT is rejected', async () => { const { handler } = await loadFunction(); assert.equal((await handler(event(serviceRoleToken()))).statusCode, 403); });
test('business directors: metadata-only super_admin spoof is rejected', async () => { const { handler } = await loadFunction(); assert.equal((await handler(event(sign({ sub: 'spoof', user_metadata: { role: 'super_admin', business_id: 'biz-a' } })))).statusCode, 403); });
test('business directors: employee without management permission is rejected', async () => { const { handler } = await loadFunction(); assert.equal((await handler(event(employeeToken('biz-a', [])))).statusCode, 403); });
test('business directors: employee cannot substitute another tenant', async () => { const { handler } = await loadFunction(); assert.equal((await handler(event(employeeToken('biz-a'), 'biz-b')).statusCode), 403); });
test('business directors: authorized employee is tenant scoped', async () => { const calls = mockFetch(); const { handler } = await loadFunction(); assert.equal((await handler(event(employeeToken(), 'biz-a'))).statusCode, 200); assert.match(calls[0].url, /business_id=eq\.biz-a/); });
test('business directors: platform operations can access requested tenant', async () => { const calls = mockFetch(); const { handler } = await loadFunction(); assert.equal((await handler(event(platformToken(), 'biz-b'))).statusCode, 200); assert.match(calls[0].url, /business_id=eq\.biz-b/); });
test('business directors: platform finance cannot access business directors', async () => { const { handler } = await loadFunction(); assert.equal((await handler(event(platformToken('platform_finance'))).statusCode), 403); });
test('business directors: database failure is sanitized', async () => { mockFetch('SECRET database error', false, 500); const { handler } = await loadFunction(); const result = await handler(event(businessToken())); assert.equal(result.statusCode, 500); assert.doesNotMatch(result.body, /SECRET database error/); });
test('business directors: missing business id is rejected', async () => { const { handler } = await loadFunction(); assert.equal((await handler(event(businessToken(), undefined))).statusCode, 400); });
test('business directors: wrong method is rejected', async () => { const { handler } = await loadFunction(); const result = await handler({ httpMethod: 'POST', headers: {}, queryStringParameters: { businessId: 'biz-a' } }); assert.equal(result.statusCode, 405); });
