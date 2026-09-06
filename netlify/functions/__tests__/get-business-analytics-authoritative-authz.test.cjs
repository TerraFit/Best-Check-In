const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-business-analytics-authz';

const { handler } = await import('../get-business-analytics.js');

function sign(payload, options = {}) {
  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, { expiresIn: '15m', ...options });
}

function signSuperAdmin(payload = {}, options = {}) {
  return sign(
    {
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'super_admin',
      ...payload,
    },
    { issuer: 'fastcheckin', audience: 'super-admin', ...options },
  );
}

function signPlatform(platformRole, payload = {}, options = {}) {
  return sign(
    {
      sub: `${platformRole}-1`,
      email: `${platformRole}@example.com`,
      platform_role: platformRole,
      ...payload,
    },
    options,
  );
}

function event(token, query = { businessId: 'biz-a' }, method = 'GET') {
  return { httpMethod: method, headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters: query };
}

function bodyOf(response) { return JSON.parse(response.body); }

function mockAnalyticsFetch() {
  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes('/businesses?')) return { ok: true, status: 200, json: async () => [{ id: 'biz-a', trading_name: 'Test Business', registered_name: 'Test Business', email: 'test@example.com', phone: '000', physical_address: 'Address', status: 'approved', created_at: '2026-01-01', subscription_tier: 'pro', subscription_status: 'active' }] };
    return { ok: true, status: 200, json: async () => [] };
  };
}

mockAnalyticsFetch();

test('business analytics: anonymous request is rejected', async () => {
  const response = await handler(event(null));
  assert.equal(response.statusCode, 401);
});

test('business analytics: invalid JWT is rejected', async () => {
  const response = await handler(event('invalid-token'));
  assert.equal(response.statusCode, 401);
});

test('business analytics: expired JWT is rejected', async () => {
  const token = sign({ sub: 'platform-1', platform_role: 'platform_analytics' }, { expiresIn: -1 });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 401);
});

test('business analytics: business actor is rejected', async () => {
  const token = sign({ sub: 'owner-1', user_metadata: { business_id: 'biz-a' } });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: employee actor is rejected', async () => {
  const token = sign({ sub: 'emp-1', user_metadata: { business_id: 'biz-a', employee_id: 'emp-1', permission_set: ['canViewDashboard'] } });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: service-role JWT is rejected', async () => {
  const token = sign({ sub: 'service-1', role: 'service_role' });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: metadata-only super_admin spoof is rejected', async () => {
  const token = sign({ sub: 'spoof-1', user_metadata: { super_admin: true, business_id: 'biz-a' } });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: platform role without analytics permission is rejected', async () => {
  const token = signPlatform('platform_operations');
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: platform analytics actor passes authorization and reaches data layer', async () => {
  const token = signPlatform('platform_analytics');
  const response = await handler(event(token));
  assert.notEqual(response.statusCode, 401);
  assert.notEqual(response.statusCode, 403);
});

test('business analytics: SuperAdmin passes authorization and reaches data layer', async () => {
  const token = signSuperAdmin();
  const response = await handler(event(token));
  assert.notEqual(response.statusCode, 401);
  assert.notEqual(response.statusCode, 403);
});

test('business analytics: missing businessId is rejected after authorization', async () => {
  const token = signPlatform('platform_analytics');
  const response = await handler(event(token, {}));
  assert.equal(response.statusCode, 400);
  assert.equal(bodyOf(response).error, 'businessId required');
});

test('business analytics: wrong HTTP method is rejected', async () => {
  const response = await handler(event(null, { businessId: 'biz-a' }, 'POST'));
  assert.equal(response.statusCode, 405);
});

test('business analytics: OPTIONS remains public preflight', async () => {
  const response = await handler(event(null, { businessId: 'biz-a' }, 'OPTIONS'));
  assert.equal(response.statusCode, 204);
});

test('business analytics: authorized platform actor cannot use a malformed token to bypass authorization', async () => {
  const token = sign({ sub: 'spoof-1', platform_role: 'platform_analytics', user_metadata: { super_admin: true } });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: database errors do not expose raw error details', async () => {
  global.fetch = async () => ({ ok: false, status: 500, text: async () => 'SECRET database details' });
  const token = signPlatform('platform_analytics');
  const response = await handler(event(token));
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /SECRET/);
  mockAnalyticsFetch();
});
