const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const SECRET = 'locked-fields-test-secret';
const MODULE = '../update-business-locked-fields.js';

function token(payload) {
  return jwt.sign(payload, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
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
  delete require.cache[require.resolve(MODULE)];
  const mod = await import(require.resolve(MODULE));
  return mod.handler;
}

function platformToken(role = 'platform_admin', permissions = ['platform:businesses:write']) {
  return token({
    sub: 'platform-user',
    role,
    platform_role: role,
    permissions,
    aud: 'authenticated',
    iss: 'https://example.supabase.co/auth/v1',
  });
}

function businessToken(businessId = 'biz-a') {
  return token({
    sub: 'business-user',
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'https://example.supabase.co/auth/v1',
    user_metadata: { business_id: businessId },
  });
}

function employeeToken(businessId = 'biz-a') {
  return token({
    sub: 'employee-user',
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'https://example.supabase.co/auth/v1',
    user_metadata: { business_id: businessId, employee_id: 'emp-1', staff_role: 'Manager' },
  });
}

function serviceRoleToken() {
  return token({
    sub: 'service-role',
    role: 'service_role',
    platform_role: 'platform_admin',
    aud: 'authenticated',
    iss: 'https://example.supabase.co/auth/v1',
  });
}

function superAdminMetadataSpoof() {
  return token({
    sub: 'spoof',
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'https://example.supabase.co/auth/v1',
    user_metadata: { role: 'super_admin', business_id: 'biz-a' },
  });
}

async function withFetchMock(fn) {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
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
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, platformToken('platform_analytics', []))));
  assert.equal(response.statusCode, 403);
});

test('platform actor with businesses write permission reaches data layer', async () => {
  const response = await withFetchMock((handler, calls) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, platformToken())) .then((r) => ({ response: r, calls })));
  assert.notEqual(response.response.statusCode, 401);
  assert.notEqual(response.response.statusCode, 403);
  assert.match(response.calls[0].url, /id=eq\.biz-a/);
});

test('platform actor cannot substitute a business tenant when tenant is bound', async () => {
  const response = await withFetchMock((handler) => handler(event({ businessId: 'biz-b', updates: { status: 'approved' } }, platformToken())));
  assert.equal(response.statusCode, 403);
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
  assert.deepEqual(written, { status: 'approved', subscription_tier: 'Business', updated_at: written.updated_at });
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
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 500, text: async () => 'SECRET database schema and credentials' });
  try {
    const handler = await loadHandler();
    const response = await handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, platformToken()));
    assert.equal(response.statusCode, 500);
    assert.doesNotMatch(response.body, /SECRET|database schema|credentials/);
  } finally {
    global.fetch = originalFetch;
  }
});
