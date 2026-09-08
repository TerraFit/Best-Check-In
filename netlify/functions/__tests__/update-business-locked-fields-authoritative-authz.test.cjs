const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-secret';
process.env.FASTCHECKIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
const MODULE = '../update-business-locked-fields.js';

function token(payload = {}) {
  return jwt.sign(payload, SECRET, { issuer: 'fastcheckin', audience: payload.aud || 'platform', expiresIn: '1h' });
}

function platformToken(role = 'platform_operations', permissions = ['platform:businesses:write']) {
  return token({ sub: 'platform-user', role, user_metadata: { actor_type: 'platform', role, permissions } });
}

function event(body, authorization, method = 'POST') {
  return {
    httpMethod: method,
    headers: authorization ? { authorization: `Bearer ${authorization}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

async function loadHandler() {
  const moduleUrl = `${require('url').pathToFileURL(require('path').resolve(__dirname, MODULE)).href}?t=${Date.now()}-${Math.random()}`;
  return (await import(moduleUrl)).handler;
}

async function withFetchMock(fn, response) {
  const originalFetch = global.fetch;
  global.fetch = async () => response;
  try {
    return await fn(await loadHandler());
  } finally {
    global.fetch = originalFetch;
  }
}

test('anonymous request is rejected', async () => {
  const response = await (await loadHandler())(event({ businessId: 'biz-a', updates: { status: 'approved' } }));
  assert.equal(response.statusCode, 401);
});

test('invalid JWT is rejected', async () => {
  const response = await (await loadHandler())(event({ businessId: 'biz-a', updates: { status: 'approved' } }, 'not-a-jwt'));
  assert.equal(response.statusCode, 401);
});

test('business owner cannot access platform-only endpoint', async () => {
  const response = await (await loadHandler())(event({ businessId: 'biz-a', updates: { status: 'approved' } }, token({ sub: 'biz-a', role: 'business', user_metadata: { business_id: 'biz-a', role: 'business' }, aud: 'business' })));
  assert.equal(response.statusCode, 403);
});

test('employee cannot access platform-only endpoint', async () => {
  const response = await (await loadHandler())(event({ businessId: 'biz-a', updates: { status: 'approved' } }, token({ sub: 'emp-a', role: 'employee', user_metadata: { employee_id: 'emp-a', business_id: 'biz-a', role: 'employee' }, aud: 'employee' })));
  assert.equal(response.statusCode, 403);
});

test('platform actor without businesses write permission is rejected', async () => {
  const response = await (await loadHandler())(event({ businessId: 'biz-a', updates: { status: 'approved' } }, platformToken('platform_support', [])));
  assert.equal(response.statusCode, 403);
});

test('authorized platform actor reaches data layer for requested tenant', async () => {
  const response = await withFetchMock(
    (handler) => handler(event({ businessId: 'biz-a', updates: { status: 'approved' } }, platformToken())),
    { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'biz-a', status: 'approved' }]) }
  );
  assert.equal(response.statusCode, 200);
});

test('platform actor must supply a target business tenant', async () => {
  const response = await (await loadHandler())(event({ updates: { status: 'approved' } }, platformToken()));
  assert.equal(response.statusCode, 400);
});

test('metadata-only super_admin spoof is rejected', async () => {
  const response = await (await loadHandler())(event({ businessId: 'biz-a', updates: { status: 'approved' } }, token({ sub: 'attacker', role: 'authenticated', user_metadata: { role: 'super_admin', actor_type: 'super_admin' }, aud: 'platform' })));
  assert.equal(response.statusCode, 403);
});

test('service-role token is rejected as an application identity', async () => {
  const response = await (await loadHandler())(event({ businessId: 'biz-a', updates: { status: 'approved' } }, token({ sub: 'service_role', role: 'service_role', aud: 'platform' })));
  assert.equal(response.statusCode, 403);
});

test('unknown fields are filtered from database write', async () => {
  let requestBody;
  const response = await withFetchMock(
    async (handler) => {
      const originalFetch = global.fetch;
      global.fetch = async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'biz-a', status: 'approved' }]) };
      };
      try { return await handler(event({ businessId: 'biz-a', updates: { status: 'approved', password_hash: 'evil' } }, platformToken())); }
      finally { global.fetch = originalFetch; }
    },
    { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'biz-a', status: 'approved' }]) }
  );
  assert.equal(response.statusCode, 200);
  assert.equal(requestBody.status, 'approved');
  assert.equal(requestBody.password_hash, undefined);
});

test('empty permitted update is rejected', async () => {
  const response = await (await loadHandler())(event({ businessId: 'biz-a', updates: { password_hash: 'evil' } }, platformToken()));
  assert.equal(response.statusCode, 400);
});

test('malformed JSON is rejected', async () => {
  const handler = await loadHandler();
  const response = await handler({ httpMethod: 'POST', headers: { authorization: `Bearer ${platformToken()}` }, body: '{' });
  assert.equal(response.statusCode, 400);
});

test('wrong HTTP method is rejected', async () => {
  const response = await (await loadHandler())(event({ businessId: 'biz-a', updates: { status: 'approved' } }, platformToken(), 'GET'));
  assert.equal(response.statusCode, 405);
});

test('OPTIONS preflight remains public', async () => {
  const response = await (await loadHandler())(event(undefined, undefined, 'OPTIONS'));
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
  assert.equal(body.data.subscription_tier, 'Business');
  assert.equal(body.data.password_hash, undefined);
  assert.equal(body.data.payment_method_id, undefined);
  assert.equal(body.data.stripe_customer_id, undefined);
  assert.equal(body.data.stripe_subscription_id, undefined);
  assert.doesNotMatch(response.body, /SECRET_PASSWORD_HASH|SECRET_PAYMENT_METHOD|SECRET_STRIPE_CUSTOMER|SECRET_STRIPE_SUBSCRIPTION/);
});
