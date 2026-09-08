const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const SECRET = 'locked-fields-test-secret';
const ISSUER = 'fastcheckin';
const MODULE = '../update-business-locked-fields.js';

function token(payload) {
  return jwt.sign(payload, SECRET, { algorithm: 'HS256', issuer: ISSUER, expiresIn: '1h' });
}

function event(body, auth) {
  return {
    httpMethod: 'POST',
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
    body: JSON.stringify(body),
  };
}

async function loadHandler() {
  process.env.SUPABASE_JWT_SECRET = SECRET;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.FASTCHECKIN_JWT_ISSUER = ISSUER;
  delete require.cache[require.resolve(MODULE)];
  const mod = await import(require.resolve(MODULE));
  return mod.handler;
}

function platformToken(role = 'platform_operations') {
  return token({
    sub: 'platform-user',
    role: 'authenticated',
    platform_role: role,
    aud: 'authenticated',
  });
}

function businessToken(businessId = 'biz-a') {
  return token({
    sub: 'business-user', role: 'authenticated', aud: 'authenticated',
    user_metadata: { business_id: businessId },
  });
}

function employeeToken(businessId = 'biz-a') {
  return token({
    sub: 'employee-user', role: 'authenticated', aud: 'authenticated',
    user_metadata: { business_id: businessId, employee_id: 'emp-1', staff_role: 'Manager' },
  });
}

function serviceRoleToken() {
  return token({
    sub: 'service-role', role: 'service_role', platform_role: 'platform_operations',
    aud: 'authenticated',
  });
}

function superAdminMetadataSpoof() {
  return token({
    sub: 'spoof', role: 'authenticated', aud: 'authenticated',
    user_metadata: { role: 'super_admin', business_id: 'biz-a' },
  });
}

async function withFetchMock(fn, responseOverride) {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return responseOverride || {
      ok: true, status: 200,
      text: async () => JSON.stringify([{ id: 'biz-a', registered_name: 'Safe', subscription_tier: 'Business' }]),
    };
  };
  try {
    const handler = await loadHandler();
    return await fn(handler, calls);
  } finally {
    global.fetch = originalFetch;
  }
}

test('anonymous request is rejected', async () => {
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } })));
  assert.equal(response.statusCode, 401);
});

test('invalid JWT is rejected', async () => {
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, 'not-a-jwt')));
  assert.equal(response.statusCode, 401);
});

test('business owner cannot access platform-only endpoint', async () => {
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, businessToken())));
  assert.equal(response.statusCode, 403);
});

test('employee cannot access platform-only endpoint', async () => {
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, employeeToken())));
  assert.equal(response.statusCode, 403);
});

test('platform actor without businesses write permission is rejected', async () => {
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, platformToken('platform_analytics'))));
  assert.equal(response.statusCode, 403);
});

test('authorized platform actor reaches data layer for requested tenant', async () => {
  const result = await withFetchMock((handler, calls) => handler(event({ businessId: 'biz-b', updates: { status: 'approved' } }, platformToken())).then((response) => ({ response, calls })));
  assert.equal(result.response.statusCode, 200);
  assert.equal(result.calls.length, 1);
  assert.match(result.calls[0].url, /id=eq\.biz-b&select=/);
});

test('platform actor must supply a target business tenant', async () => {
  const response = await withFetchMock((handler) => handler(event({ updates: { status: 'approved' } }, platformToken())));
  assert.equal(response.statusCode, 400);
});

test('metadata-only super_admin spoof is rejected', async () => {
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, superAdminMetadataSpoof())));
  assert.equal(response.statusCode, 403);
});

test('service-role token is rejected as an application identity', async () => {
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, serviceRoleToken())));
  assert.equal(response.statusCode, 403);
});

test('unknown fields are filtered from database write', async () => {
  const result = await withFetchMock((handler, calls) => handler(event({
    businessId: 'biz-a',
    updates: { status: 'approved', subscription_tier: 'Business', secret_internal_field: 'LEAK' },
  }, platformToken())).then((response) => ({ response, calls })));
  assert.equal(result.response.statusCode, 200);
  const written = JSON.parse(result.calls[0].options.body);
  assert.equal(written.status, 'approved');
  assert.equal(written.subscription_tier, 'Business');
  assert.equal(typeof written.updated_at, 'string');
  assert.equal(Object.prototype.hasOwnProperty.call(written, 'secret_internal_field'), false);
});

test('empty permitted update is rejected', async () => {
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-a', updates: { trading_name: 'Not locked' } }, platformToken())));
  assert.equal(response.statusCode, 400);
});

test('malformed JSON is rejected', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('fetch must not be reached'); };
  try {
    const handler = await loadHandler();
    const response = await handler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${platformToken()}` },
      body: '{bad json',
    });
    assert.equal(response.statusCode, 400);
  } finally {
    global.fetch = originalFetch;
  }
});

test('wrong HTTP method is rejected', async () => {
  const handler = await loadHandler();
  const response = await handler({ httpMethod: 'GET', headers: {}, body: '' });
  assert.equal(response.statusCode, 405);
});

test('OPTIONS preflight remains public', async () => {
  const handler = await loadHandler();
  const response = await handler({ httpMethod: 'OPTIONS', headers: {}, body: '' });
  assert.equal(response.statusCode, 204);
});

test('database failures are sanitized', async () => {
  const response = await withFetchMock(
    (handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, platformToken())),
    { ok: false, status: 500, text: async () => 'SECRET database schema and credentials' }
  );
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /SECRET|database schema|credentials/);
});

test('response excludes unrelated sensitive business columns', async () => {
  const response = await withFetchMock(
    (handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, platformToken())),
    {
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{
        id: 'biz-a',
        status: 'approved',
        password_hash: 'SECRET_PASSWORD_HASH',
        payment_method_id: 'SECRET_PAYMENT_METHOD',
        stripe_customer_id: 'SECRET_STRIPE_CUSTOMER',
        stripe_subscription_id: 'SECRET_STRIPE_SUBSCRIPTION',
        subscription_tier: 'Business',
      }]),
    }
  );
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.data.id, 'biz-a');
  assert.equal(body.data.status, 'approved');
  assert.equal(body.data.password_hash, undefined);
  assert.equal(body.data.payment_method_id, undefined);
  assert.equal(body.data.stripe_customer_id, undefined);
  assert.equal(body.data.stripe_subscription_id, undefined);
  assert.equal(body.data.subscription_tier, undefined);
  assert.doesNotMatch(response.body, /SECRET_PASSWORD_HASH|SECRET_PAYMENT_METHOD|SECRET_STRIPE_CUSTOMER|SECRET_STRIPE_SUBSCRIPTION/);
});
