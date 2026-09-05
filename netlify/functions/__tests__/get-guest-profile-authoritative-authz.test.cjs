const test = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_ENV = { ...process.env };
const originalFetch = global.fetch;

function loadHandler() {
  const path = require.resolve('../get-guest-profile.js');
  delete require.cache[path];
  return require(path).handler;
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
  const handler = loadHandler();
  const response = await handler(event({ method: 'OPTIONS' }));
  assert.equal(response.statusCode, 204);
});

test('non-GET methods are rejected', async () => {
  setConfiguredEnv();
  const handler = loadHandler();
  const response = await handler(event({ method: 'POST', email: 'guest@example.com', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 405);
});

test('missing email is rejected before data-layer access', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = loadHandler();
  const response = await handler(event({ business_id: 'biz-a' }));
  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('missing business_id is rejected before data-layer access', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const handler = loadHandler();
  const response = await handler(event({ email: 'guest@example.com' }));
  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('unknown business is rejected before guest lookup', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return jsonResponse([]);
  };
  const handler = loadHandler();
  const response = await handler(event({ email: 'guest@example.com', business_id: 'biz-unknown' }));
  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /businesses\?/);
});

test('unapproved business is rejected before guest lookup', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    if (urls.length === 1) return jsonResponse([{ id: 'biz-a', status: 'pending', service_paused: false }]);
    return jsonResponse([]);
  };
  const handler = loadHandler();
  const response = await handler(event({ email: 'guest@example.com', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
});

test('paused business is rejected before guest lookup', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    if (urls.length === 1) return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: true }]);
    return jsonResponse([]);
  };
  const handler = loadHandler();
  const response = await handler(event({ email: 'guest@example.com', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
});

test('business validation failure returns 502 and prevents guest lookup', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return { ok: false, status: 503, json: async () => ({}) };
  };
  const handler = loadHandler();
  const response = await handler(event({ email: 'guest@example.com', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 502);
  assert.equal(urls.length, 1);
});

test('validated business id must match the returned business record', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    if (urls.length === 1) return jsonResponse([{ id: 'biz-other', status: 'approved', service_paused: false }]);
    return jsonResponse([]);
  };
  const handler = loadHandler();
  const response = await handler(event({ email: 'guest@example.com', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
});

test('email at another establishment cannot retrieve the global guest profile', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    if (urls.length === 1) return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: false }]);
    if (urls.length === 2) return jsonResponse([]); // no booking for this email at biz-a
    return jsonResponse([{ full_name: 'Secret Guest', country: 'CH' }]);
  };
  const handler = loadHandler();
  const response = await handler(event({ email: 'secret@example.com', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).profile, null);
  assert.equal(urls.length, 2);
  assert.match(urls[1], /bookings\?/);
  assert.match(urls[1], /business_id=eq\.biz-a/);
});

test('authorized returning guest lookup is tenant-bound and returns only minimal profile fields', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    if (urls.length === 1) return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: false }]);
    if (urls.length === 2) return jsonResponse([{ id: 'booking-1', business_id: 'biz-a', guest_email: 'guest@example.com' }]);
    return jsonResponse([{ full_name: 'Jane Doe', country: 'CH', phone: '+410000000', id_number: 'SECRET' }]);
  };
  const handler = loadHandler();
  const response = await handler(event({ email: ' Guest@Example.com ', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.deepEqual(body.profile, {
    full_name: 'Jane Doe',
    first_name: 'Jane',
    last_name: 'Doe',
    country: 'CH'
  });
  assert.equal(urls.length, 3);
  assert.match(urls[1], /business_id=eq\.biz-a/);
  assert.match(urls[1], /guest_email=eq\.guest%40example\.com/);
  assert.match(urls[2], /guest_profiles\?/);
  assert.match(urls[2], /select=full_name%2Ccountry/);
  assert.doesNotMatch(urls[2], /phone|id_number|passport|signature/i);
});

test('conflicting business ids are not trusted from a global profile response', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    if (urls.length === 1) return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: false }]);
    if (urls.length === 2) return jsonResponse([{ id: 'booking-1', business_id: 'biz-a', guest_email: 'guest@example.com' }]);
    return jsonResponse([{ full_name: 'Guest A', country: 'ZA' }]);
  };
  const handler = loadHandler();
  const response = await handler(event({ email: 'guest@example.com', business_id: 'biz-a' }));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).profile.first_name, 'Guest');
  assert.match(urls[1], /business_id=eq\.biz-a/);
});
