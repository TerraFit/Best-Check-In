const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';
process.env.SUPER_ADMIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPER_ADMIN_JWT_AUDIENCE = 'super-admin';
process.env.RESEND_API_KEY = '';

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

const superAdmin = token({
  role: 'super_admin',
  iss: process.env.SUPER_ADMIN_JWT_ISSUER,
  aud: process.env.SUPER_ADMIN_JWT_AUDIENCE,
  user_metadata: {},
});
const business = token({ user_metadata: { business_id: 'biz-a' } });
const employee = token({ user_metadata: { business_id: 'biz-a', employee_id: 'emp-1', staff_role: 'Manager' } });
const platform = token({ platform_role: 'platform_operations', user_metadata: {} });
const spoofedSuperAdmin = token({ user_metadata: { business_id: 'biz-a', role: 'super_admin' } });
const serviceRole = token({ role: 'service_role', platform_role: 'platform_operations', user_metadata: {} });
const expired = jwt.sign({ sub: 'expired', role: 'super_admin', iss: process.env.SUPER_ADMIN_JWT_ISSUER, aud: process.env.SUPER_ADMIN_JWT_AUDIENCE }, process.env.SUPABASE_JWT_SECRET, { expiresIn: -1 });

function event({ auth, body = JSON.stringify({ businessId: 'biz-a' }), method = 'POST' } = {}) {
  return { httpMethod: method, headers: auth ? { authorization: `Bearer ${auth}` } : {}, body };
}

async function loadHandler() {
  const mod = await import(`../approve-business.js?test=${Date.now()}-${Math.random()}`);
  return mod.handler;
}

async function invoke({ auth, body, method, fetchImpl } = {}) {
  const originalFetch = global.fetch;
  if (fetchImpl) global.fetch = fetchImpl;
  try {
    return await (await loadHandler())(event({ auth, body, method }));
  } finally {
    global.fetch = originalFetch;
  }
}

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() { return typeof body === 'string' ? JSON.parse(body) : body; },
  async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
});

const pendingBusiness = { id: 'biz-a', status: 'pending', trading_name: 'Test Lodge', email: 'owner@example.com' };

function successfulFetch(url, options) {
  if (options?.method === 'PATCH') return Promise.resolve(response(200, [{ ...pendingBusiness, status: 'approved' }]));
  if (url.includes('/email_verifications')) return Promise.resolve(response(201, [{ id: 'verification-1' }]));
  return Promise.resolve(response(200, [pendingBusiness]));
}

test('approve business: anonymous request is rejected', async () => {
  const result = await invoke({ fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 401);
});

test('approve business: invalid JWT is rejected', async () => {
  const result = await invoke({ auth: 'not-a-valid-jwt', fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 401);
});

test('approve business: expired SuperAdmin JWT is rejected', async () => {
  const result = await invoke({ auth: expired, fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 401);
});

test('approve business: business owner is rejected', async () => {
  const result = await invoke({ auth: business, fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 403);
});

test('approve business: employee is rejected', async () => {
  const result = await invoke({ auth: employee, fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 403);
});

test('approve business: platform actor is rejected', async () => {
  const result = await invoke({ auth: platform, fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 403);
});

test('approve business: metadata-only SuperAdmin spoof is rejected', async () => {
  const result = await invoke({ auth: spoofedSuperAdmin, fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 403);
});

test('approve business: service-role token is rejected', async () => {
  const result = await invoke({ auth: serviceRole, fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 403);
});

test('approve business: missing businessId is rejected', async () => {
  const result = await invoke({ auth: superAdmin, body: JSON.stringify({}), fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 400);
});

test('approve business: malformed JSON is rejected', async () => {
  const result = await invoke({ auth: superAdmin, body: '{bad json', fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 400);
});

test('approve business: unknown business is rejected', async () => {
  const result = await invoke({ auth: superAdmin, fetchImpl: async () => response(200, []) });
  assert.equal(result.statusCode, 404);
});

test('approve business: non-pending business cannot be approved', async () => {
  const result = await invoke({ auth: superAdmin, fetchImpl: async () => response(200, [{ ...pendingBusiness, status: 'approved' }]) });
  assert.equal(result.statusCode, 400);
});

test('approve business: validation failure is sanitized', async () => {
  const result = await invoke({ auth: superAdmin, fetchImpl: async () => response(500, 'SECRET validation details') });
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /SECRET validation details/);
});

test('approve business: update failure is sanitized', async () => {
  let calls = 0;
  const result = await invoke({
    auth: superAdmin,
    fetchImpl: async (url, options) => {
      calls += 1;
      if (calls === 1) return response(200, [pendingBusiness]);
      if (url.includes('/email_verifications')) return response(201, []);
      return response(500, 'SECRET update details');
    },
  });
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /SECRET update details/);
});

test('approve business: authorized approval uses encoded tenant target and preserves response shape', async () => {
  const calls = [];
  const result = await invoke({
    auth: superAdmin,
    body: JSON.stringify({ businessId: 'biz/a' }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (options?.method === 'PATCH') return response(200, [{ id: 'biz/a', trading_name: 'Test Lodge', email: 'owner@example.com', status: 'approved' }]);
      if (url.includes('/email_verifications')) return response(201, []);
      return response(200, [{ ...pendingBusiness, id: 'biz/a' }]);
    },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).success, true);
  assert.match(calls[0].url, /id=eq\.biz%2Fa/);
  assert.match(calls.find(call => call.options?.method === 'PATCH').url, /id=eq\.biz%2Fa/);
});

test('approve business: wrong HTTP method is rejected', async () => {
  const result = await invoke({ auth: superAdmin, method: 'GET', fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 405);
});

test('approve business: OPTIONS remains public preflight', async () => {
  const result = await invoke({ method: 'OPTIONS', fetchImpl: successfulFetch });
  assert.equal(result.statusCode, 204);
});
