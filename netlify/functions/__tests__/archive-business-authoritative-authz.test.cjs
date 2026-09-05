const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';
process.env.SUPER_ADMIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPER_ADMIN_JWT_AUDIENCE = 'super-admin';

function token(claims = {}) {
  return jwt.sign({
    sub: 'user-1',
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'https://example.supabase.co/auth/v1',
    user_metadata: { business_id: 'biz-a', ...claims.user_metadata },
    ...claims,
  }, process.env.SUPABASE_JWT_SECRET, { expiresIn: '1h' });
}

function event({ auth, body = JSON.stringify({ businessId: 'biz-a' }), method = 'POST' } = {}) {
  return {
    httpMethod: method,
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
    body,
  };
}

async function loadHandler() {
  const mod = await import(`../archive-business.js?test=${Date.now()}-${Math.random()}`);
  return mod.handler;
}

async function invoke({ auth, body, method, fetchImpl } = {}) {
  const originalFetch = global.fetch;
  if (fetchImpl) global.fetch = fetchImpl;
  try {
    const handler = await loadHandler();
    return await handler(event({ auth, body, method }));
  } finally {
    global.fetch = originalFetch;
  }
}

const superAdmin = token({
  role: 'super_admin',
  iss: process.env.SUPER_ADMIN_JWT_ISSUER,
  aud: process.env.SUPER_ADMIN_JWT_AUDIENCE,
  user_metadata: {},
});
const platform = token({ platform_role: 'platform_operations', user_metadata: {} });
const business = token({ user_metadata: { business_id: 'biz-a' } });
const employee = token({ user_metadata: { business_id: 'biz-a', employee_id: 'emp-1', staff_role: 'Manager' } });
const spoofedSuperAdmin = token({ user_metadata: { business_id: 'biz-a', role: 'super_admin' } });
const serviceRole = token({ role: 'service_role', platform_role: 'platform_operations', user_metadata: {} });
const expired = jwt.sign({
  sub: 'expired',
  role: 'super_admin',
  aud: process.env.SUPER_ADMIN_JWT_AUDIENCE,
  iss: process.env.SUPER_ADMIN_JWT_ISSUER,
}, process.env.SUPABASE_JWT_SECRET, { expiresIn: -1 });

const okFetch = async (url, options) => ({
  ok: true,
  status: 200,
  json: async () => [{ id: 'biz-a', status: 'archived' }],
  text: async () => JSON.stringify([{ id: 'biz-a', status: 'archived' }]),
});

const dbFailureFetch = async () => ({
  ok: false,
  status: 500,
  text: async () => 'SECRET database details',
  json: async () => ({ error: 'SECRET database details' }),
});

test('anonymous request is rejected', async () => {
  const response = await invoke({ fetchImpl: okFetch });
  assert.equal(response.statusCode, 401);
});

test('invalid JWT is rejected', async () => {
  const response = await invoke({ auth: 'not-a-valid-token', fetchImpl: okFetch });
  assert.equal(response.statusCode, 401);
});

test('expired SuperAdmin JWT is rejected', async () => {
  const response = await invoke({ auth: expired, fetchImpl: okFetch });
  assert.equal(response.statusCode, 401);
});

test('business owner cannot archive a business', async () => {
  const response = await invoke({ auth: business, fetchImpl: okFetch });
  assert.equal(response.statusCode, 403);
});

test('employee cannot archive a business', async () => {
  const response = await invoke({ auth: employee, fetchImpl: okFetch });
  assert.equal(response.statusCode, 403);
});

test('platform actor cannot archive a business', async () => {
  const response = await invoke({ auth: platform, fetchImpl: okFetch });
  assert.equal(response.statusCode, 403);
});

test('metadata-only SuperAdmin spoof is rejected', async () => {
  const response = await invoke({ auth: spoofedSuperAdmin, fetchImpl: okFetch });
  assert.equal(response.statusCode, 403);
});

test('service-role token is rejected as an application identity', async () => {
  const response = await invoke({ auth: serviceRole, fetchImpl: okFetch });
  assert.equal(response.statusCode, 403);
});

test('missing businessId is rejected', async () => {
  const response = await invoke({ auth: superAdmin, body: JSON.stringify({}), fetchImpl: okFetch });
  assert.equal(response.statusCode, 400);
});

test('malformed JSON is rejected', async () => {
  const response = await invoke({ auth: superAdmin, body: '{bad json', fetchImpl: okFetch });
  assert.equal(response.statusCode, 400);
});

test('unknown business is not reported as successfully archived', async () => {
  const response = await invoke({
    auth: superAdmin,
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => '[]', json: async () => [] }),
  });
  assert.notEqual(response.statusCode, 200);
});

test('database failures are sanitized', async () => {
  const response = await invoke({ auth: superAdmin, fetchImpl: dbFailureFetch });
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /SECRET database details/);
});

test('successful archive targets the requested business and preserves response shape', async () => {
  let call;
  const response = await invoke({
    auth: superAdmin,
    body: JSON.stringify({ businessId: 'biz-b' }),
    fetchImpl: async (url, options) => {
      call = { url, options };
      return okFetch(url, options);
    },
  });
  assert.equal(response.statusCode, 200);
  assert.match(call.url, /id=eq\.biz-b/);
  assert.equal(JSON.parse(response.body).success, true);
});

test('wrong HTTP method is rejected', async () => {
  const response = await invoke({ auth: superAdmin, method: 'GET', fetchImpl: okFetch });
  assert.equal(response.statusCode, 405);
});

test('OPTIONS preflight remains public', async () => {
  const response = await invoke({ method: 'OPTIONS', fetchImpl: okFetch });
  assert.equal(response.statusCode, 204);
});