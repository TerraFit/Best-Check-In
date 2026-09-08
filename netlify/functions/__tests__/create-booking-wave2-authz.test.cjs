const test = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_ENV = { ...process.env };
const originalFetch = global.fetch;

function loadHandler() {
  return import(`../create-booking.js?test=${Date.now()}-${Math.random()}`).then((module) => module.handler);
}

function event({ method = 'POST', body = {} } = {}) {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  };
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

  const response = await handler(event({ method: 'OPTIONS' }));

  assert.equal(response.statusCode, 204);
});

test('non-POST methods are rejected before database access', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const handler = await loadHandler();
  const response = await handler(event({ method: 'GET', body: { business_id: 'biz-a' } }));

  assert.equal(response.statusCode, 405);
  assert.equal(fetchCalls, 0);
});

test('missing business_id is rejected before database access', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const handler = await loadHandler();
  const response = await handler(event({ body: { guest_email: 'guest@example.com' } }));

  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('unapproved business cannot receive an anonymous booking', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([{ id: 'biz-a', status: 'pending', service_paused: false }]);
  };

  const handler = await loadHandler();
  const response = await handler(event({ body: {
    business_id: 'biz-a',
    guest_name: 'Jane Doe',
    nights: 1,
  } }));

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 1);
});

test('paused business cannot receive an anonymous booking', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: true }]);
  };

  const handler = await loadHandler();
  const response = await handler(event({ body: {
    business_id: 'biz-a',
    guest_name: 'Jane Doe',
    nights: 1,
  } }));

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 1);
});

test('malicious business_id is bound to the exact requested tenant', async () => {
  setConfiguredEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: false }]);
  };

  const handler = await loadHandler();
  const response = await handler(event({ body: {
    business_id: 'biz-attacker',
    guest_name: 'Jane Doe',
    nights: 1,
  } }));

  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /id=eq\.biz-attacker/);
});

test('client-supplied checkout date cannot override server-derived stay dates', async () => {
  setConfiguredEnv();
  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (requests.length === 1) {
      return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: false }]);
    }
    return jsonResponse([{ id: 'booking-1' }]);
  };

  const handler = await loadHandler();
  const response = await handler(event({ body: {
    business_id: 'biz-a',
    guest_name: 'Jane Doe',
    check_in_date: '2026-09-10',
    check_out_date: '2099-12-31',
    nights: 2,
  } }));

  assert.equal(response.statusCode, 200);
  const insert = JSON.parse(requests[1].options.body)[0];
  assert.equal(insert.check_in_date, '2026-09-10');
  assert.equal(insert.check_out_date, '2026-09-12');
  assert.equal(insert.nights, 2);
});

test('anonymous client cannot manufacture a privileged booking status', async () => {
  setConfiguredEnv();
  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (requests.length === 1) return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: false }]);
    return jsonResponse([{ id: 'booking-1' }]);
  };

  const handler = await loadHandler();
  const response = await handler(event({ body: {
    business_id: 'biz-a',
    guest_name: 'Jane Doe',
    nights: 1,
    status: 'cancelled',
    approval_status: 'approved',
  } }));

  assert.equal(response.statusCode, 200);
  const insert = JSON.parse(requests[1].options.body)[0];
  assert.equal(insert.status, 'checked_in');
  assert.equal(insert.approval_status, undefined);
});

test('client-supplied total_amount is never persisted', async () => {
  setConfiguredEnv();
  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (requests.length === 1) return jsonResponse([{ id: 'biz-a', status: 'approved', service_paused: false }]);
    return jsonResponse([{ id: 'booking-1' }]);
  };

  const handler = await loadHandler();
  const response = await handler(event({ body: {
    business_id: 'biz-a',
    guest_name: 'Jane Doe',
    nights: 1,
    total_amount: 0.01,
  } }));

  assert.equal(response.statusCode, 200);
  const insert = JSON.parse(requests[1].options.body)[0];
  assert.equal(insert.total_amount, undefined);
});

test('malformed JSON is rejected without a booking insert', async () => {
  setConfiguredEnv();
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const handler = await loadHandler();
  const response = await handler({ httpMethod: 'POST', body: '{not-json' });

  assert.equal(response.statusCode, 500);
  assert.equal(fetchCalls, 0);
});
