const test = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_ENV = { ...process.env };
const originalFetch = global.fetch;

async function loadHandler() {
  const module = await import('../get-guest-profile.js?test=' + Date.now());
  return module.handler;
}

function event({ method = 'GET', email, business_id } = {}) {
  const queryStringParameters = {};
  if (email !== undefined) queryStringParameters.email = email;
  if (business_id !== undefined) queryStringParameters.business_id = business_id;
  return { httpMethod: method, queryStringParameters };
}

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function setConfiguredEnv() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
}

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = originalFetch;
}

test.afterEach(restoreEnv);

test('OPTIONS remains public', async () => {
  setConfiguredEnv();
  const handler = await loadHandler();
  assert.equal((await handler(event({ method: 'OPTIONS' }))).statusCode, 204);
});

test('non-GET methods are rejected', async () => {
  setConfiguredEnv();
  const handler = await loadHandler();
  assert.equal((await handler(event({ method: 'POST', email: 'guest@example.com', business_id: 'biz-a' }))).statusCode, 405);
});

test('missing email and business_id are rejected before data access', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = await loadHandler();
  assert.equal((await handler(event({ business_id: 'biz-a' }))).statusCode, 400);
  assert.equal((await handler(event({ email: 'guest@example.com' }))).statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('unknown, unapproved and paused businesses are rejected before guest lookup', async () => {
  setConfiguredEnv();
  const cases = [
    [],
    [{ id: 'biz-a', status: 'pending', service_paused: false }],
    [{ id: 'biz-a', status: 'approved', service_paused: true }],
  ];
  for (const business of cases) {
    const urls = [];
    global.fetch = async url => { urls.push(String(url)); return jsonResponse(business); };
    const handler = await loadHandler();
    assert.equal((await handler(event({ email: 'guest@example.com', business_id: 'biz-a' }))).statusCode, 403);
    assert.equal(urls.length, 1);
  }
});

test('business validation failure returns 502 and prevents guest lookup', async () => {
  setConfiguredEnv();
  let calls = 0;
  global.fetch = async () => { calls += 1; return { ok: false, status: 503, json: async () => ({}) }; };
  const handler = await loadHandler();
  assert.equal((await handler(event({ email: 'guest@example.com', business_id: 'biz-a' }))).statusCode, 502);
  assert.equal(calls, 1);
});

test('returning guest lookup returns the complete tenant-scoped guest details', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async url => {
    urls.push(String(url));
    if (urls.length === 1) return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: false }]);
    return jsonResponse([{
      id: 'booking-1', business_id: 'biz-a', guest_email: 'guest@example.com',
      guest_name: 'Jane Doe', guest_first_name: 'Jane', guest_last_name: 'Doe', guest_country: 'CH',
      guest_phone: '+410000000', guest_id_number: 'A1234567', guest_province: 'Western Cape', guest_city: 'Cape Town'
    }]);
  };
  const handler = await loadHandler();
  const response = await handler(event({ email: ' Guest@Example.com ', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).profile, {
    full_name: 'Jane Doe', first_name: 'Jane', last_name: 'Doe', country: 'CH',
    phone: '+410000000', passport_or_id: 'A1234567', province: 'Western Cape', city: 'Cape Town'
  });
  assert.equal(urls.length, 2);
  assert.match(urls[1], /business_id=eq\.biz-a/);
  assert.match(urls[1], /guest_email=eq\.guest%40example\.com/);
  assert.match(urls[1], /guest_phone/);
  assert.match(urls[1], /guest_id_number/);
  assert.match(urls[1], /guest_province/);
  assert.match(urls[1], /guest_city/);
  assert.doesNotMatch(urls[1], /guest_profiles/);
});

test('cross-tenant booking rows are never exposed', async () => {
  setConfiguredEnv();
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: false }]);
    return jsonResponse([{ id: 'booking-other', business_id: 'biz-b', guest_email: 'guest@example.com', guest_name: 'Secret Guest', guest_country: 'CH' }]);
  };
  const handler = await loadHandler();
  const response = await handler(event({ email: 'guest@example.com', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).profile, null);
});
