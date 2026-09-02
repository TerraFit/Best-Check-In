const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
function sign(payload, options = {}) { return jwt.sign(payload, SECRET, { expiresIn: '15m', ...options }); }
function eventWithToken(token, body) { return { httpMethod: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }; }
function businessToken(businessId = 'biz-a', extra = {}) { return sign({ sub: `owner-${businessId}`, user_metadata: { business_id: businessId }, ...extra }); }
function employeeToken(businessId = 'biz-a', permissions = ['canManageSettings']) { return sign({ sub: `emp-${businessId}`, user_metadata: { business_id: businessId, employee_id: `emp-${businessId}`, staff_role: 'Manager', permission_set: permissions } }); }
function platformToken(role = 'platform_operations') { return sign({ sub: `${role}-1`, email: `${role}@example.com`, platform_role: role }); }

async function loadFunction(name) { return import(`../${name}.js?test=${Date.now()}-${Math.random()}`); }
function mockFetch(result = [{ id: 'biz-a', trading_name: 'Test Business' }]) {
  global.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify(result) });
}

test('update-business-settings: anonymous request is rejected', async () => {
  const { handler } = await loadFunction('update-business-settings');
  const result = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ businessId: 'biz-a', marketing_consent_enabled: true }) });
  assert.equal(result.statusCode, 401);
});

test('update-business-settings: business owner cannot cross tenant', async () => {
  const { handler } = await loadFunction('update-business-settings');
  const result = await handler(eventWithToken(businessToken('biz-a'), { businessId: 'biz-b', marketing_consent_enabled: true }));
  assert.equal(result.statusCode, 403);
});

test('update-business-settings: authorized owner updates only own tenant', async () => {
  mockFetch();
  const { handler } = await loadFunction('update-business-settings');
  const result = await handler(eventWithToken(businessToken('biz-a'), { businessId: 'biz-a', marketing_consent_enabled: true }));
  assert.equal(result.statusCode, 200);
});

test('update-business-settings: employee without settings permission is rejected', async () => {
  const { handler } = await loadFunction('update-business-settings');
  const result = await handler(eventWithToken(employeeToken('biz-a', ['canViewDashboard']), { businessId: 'biz-a', marketing_consent_enabled: true }));
  assert.equal(result.statusCode, 403);
});

test('update-business-profile: anonymous request is rejected', async () => {
  const { handler } = await loadFunction('update-business-profile');
  const result = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ businessId: 'biz-a', trading_name: 'X' }) });
  assert.equal(result.statusCode, 401);
});

test('update-business-profile: cross-tenant substitution is rejected', async () => {
  const { handler } = await loadFunction('update-business-profile');
  const result = await handler(eventWithToken(businessToken('biz-a'), { businessId: 'biz-b', trading_name: 'Attacker' }));
  assert.equal(result.statusCode, 403);
});

test('update-business-profile: authorized owner can update own tenant', async () => {
  mockFetch();
  const { handler } = await loadFunction('update-business-profile');
  const result = await handler(eventWithToken(businessToken('biz-a'), { businessId: 'biz-a', trading_name: 'Updated' }));
  assert.equal(result.statusCode, 200);
});

test('update-business-profile: subscription fields are not accepted through profile endpoint', async () => {
  const { handler } = await loadFunction('update-business-profile');
  const result = await handler(eventWithToken(businessToken('biz-a'), { businessId: 'biz-a', subscription_tier: 'Business' }));
  assert.equal(result.statusCode, 400);
});

test('update-business-locked-fields: anonymous request is rejected', async () => {
  const { handler } = await loadFunction('update-business-locked-fields');
  const result = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ businessId: 'biz-a', updates: { service_paused: true } }) });
  assert.equal(result.statusCode, 401);
});

test('update-business-locked-fields: business owner is rejected', async () => {
  const { handler } = await loadFunction('update-business-locked-fields');
  const result = await handler(eventWithToken(businessToken('biz-a'), { businessId: 'biz-a', updates: { service_paused: true } }));
  assert.equal(result.statusCode, 403);
});

test('update-business-locked-fields: platform support is rejected', async () => {
  const { handler } = await loadFunction('update-business-locked-fields');
  const result = await handler(eventWithToken(platformToken('platform_support'), { businessId: 'biz-a', updates: { service_paused: true } }));
  assert.equal(result.statusCode, 403);
});

test('update-business-locked-fields: platform operations may update target tenant', async () => {
  mockFetch();
  const { handler } = await loadFunction('update-business-locked-fields');
  const result = await handler(eventWithToken(platformToken('platform_operations'), { businessId: 'biz-b', updates: { service_paused: true } }));
  assert.equal(result.statusCode, 200);
});

test('update-business-locked-fields: arbitrary fields cannot be smuggled through updates', async () => {
  const { handler } = await loadFunction('update-business-locked-fields');
  const result = await handler(eventWithToken(platformToken('platform_operations'), { businessId: 'biz-a', updates: { trading_name: 'Nope' } }));
  assert.equal(result.statusCode, 400);
});
