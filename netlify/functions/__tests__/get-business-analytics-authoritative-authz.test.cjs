const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-business-analytics-authz';

const { handler } = require('../get-business-analytics.js');

function sign(payload, options = {}) {
  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, { expiresIn: '15m', ...options });
}

function signSuperAdmin(payload = {}, options = {}) {
  return sign(
    {
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'super_admin',
      user_metadata: { super_admin: true },
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
  return {
    httpMethod: method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    queryStringParameters: query,
  };
}

async function bodyOf(response) {
  return JSON.parse(response.body);
}

test('business analytics: anonymous request is rejected', async () => {
  const response = await handler(event(null));
  assert.equal(response.statusCode, 401);
});

test('business analytics: invalid JWT is rejected', async () => {
  const response = await handler(event('not-a-jwt'));
  assert.equal(response.statusCode, 401);
});

test('business analytics: expired JWT is rejected', async () => {
  const token = sign({ sub: 'expired' }, { expiresIn: -1 });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 401);
});

test('business analytics: business actor is rejected', async () => {
  const token = sign({ sub: 'business-1', user_metadata: { business_id: 'biz-a' } });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: employee actor is rejected', async () => {
  const token = sign({
    sub: 'employee-1',
    user_metadata: {
      business_id: 'biz-a',
      employee_id: 'emp-1',
      staff_role: 'Manager',
      permission_set: ['canExportReports'],
    },
  });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: service-role JWT is rejected', async () => {
  const token = sign({ role: 'service_role', sub: 'service' });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: metadata-only super_admin spoof is rejected', async () => {
  const token = sign({
    sub: 'employee-1',
    user_metadata: {
      business_id: 'biz-a',
      employee_id: 'emp-1',
      role: 'super_admin',
      permission_set: ['platform:analytics:read'],
    },
  });
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
  assert.equal((await bodyOf(response)).error, 'businessId required');
});

test('business analytics: wrong HTTP method is rejected', async () => {
  const response = await handler(event(null, { businessId: 'biz-a' }, 'POST'));
  assert.equal(response.statusCode, 405);
});

test('business analytics: OPTIONS remains public preflight', async () => {
  const response = await handler(event(null, {}, 'OPTIONS'));
  assert.equal(response.statusCode, 204);
  assert.equal(response.body, '');
});

test('business analytics: authorized platform actor cannot use a malformed token to bypass authorization', async () => {
  const token = signPlatform('platform_analytics', { role: 'service_role' });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business analytics: database errors do not expose raw error details', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const token = signPlatform('platform_analytics');
    const response = await handler(event(token));
    const body = await bodyOf(response);
    assert.equal(response.statusCode, 500);
    assert.equal(body.error, 'Internal Server Error');
    assert.equal(body.details, undefined);
  } finally {
    console.error = original;
  }
});
