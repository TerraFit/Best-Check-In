const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

async function fn() {
  return import(`../create-booking.js?test=${Date.now()}-${Math.random()}`);
}

function event(method = 'POST', body) {
  return {
    httpMethod: method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

function response(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

async function withFetch(t, implementation, callback) {
  const originalFetch = global.fetch;
  global.fetch = implementation;
  try {
    return await callback();
  } finally {
    global.fetch = originalFetch;
  }
}

test('create-booking: security and public-endpoint authorization gates', async (t) => {
  await t.test('OPTIONS remains publicly callable', async () => {
    const { handler } = await fn();
    const result = await handler(event('OPTIONS'));
    assert.equal(result.statusCode, 204);
  });

  await t.test('non-POST methods are rejected', async () => {
    const { handler } = await fn();
    const result = await handler(event('GET'));
    assert.equal(result.statusCode, 405);
  });

  await t.test('missing business_id is rejected before any data-layer access', async () => {
    const { handler } = await fn();
    let fetchCalled = false;
    const result = await withFetch(t, async () => {
      fetchCalled = true;
      throw new Error('fetch must not be called');
    }, () => handler(event('POST', { guest_name: 'Guest' })));
    assert.equal(result.statusCode, 400);
    assert.equal(fetchCalled, false);
  });

  await t.test('unknown business is rejected before booking creation', async () => {
    const { handler } = await fn();
    const calls = [];
    const result = await withFetch(t, async (url) => {
      calls.push(String(url));
      return response(200, []);
    }, () => handler(event('POST', { business_id: 'biz-unknown', guest_name: 'Guest' })));
    assert.equal(result.statusCode, 403);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /businesses\?id=eq\.biz-unknown/);
  });

  await t.test('unapproved business is rejected before booking creation', async () => {
    const { handler } = await fn();
    const calls = [];
    const result = await withFetch(t, async (url) => {
      calls.push(String(url));
      return response(200, [{ id: 'biz-a', status: 'pending', service_paused: false }]);
    }, () => handler(event('POST', { business_id: 'biz-a', guest_name: 'Guest' })));
    assert.equal(result.statusCode, 403);
    assert.equal(calls.length, 1);
  });

  await t.test('paused business is rejected before booking creation', async () => {
    const { handler } = await fn();
    const calls = [];
    const result = await withFetch(t, async (url) => {
      calls.push(String(url));
      return response(200, [{ id: 'biz-a', status: 'approved', service_paused: true }]);
    }, () => handler(event('POST', { business_id: 'biz-a', guest_name: 'Guest' })));
    assert.equal(result.statusCode, 403);
    assert.equal(calls.length, 1);
  });

  await t.test('business validation failure prevents booking creation', async () => {
    const { handler } = await fn();
    const calls = [];
    const result = await withFetch(t, async (url) => {
      calls.push(String(url));
      return response(503, { error: 'upstream unavailable' });
    }, () => handler(event('POST', { business_id: 'biz-a', guest_name: 'Guest' })));
    assert.equal(result.statusCode, 502);
    assert.equal(calls.length, 1);
  });

  await t.test('approved active business may create a booking and server derives checkout', async () => {
    const { handler } = await fn();
    const calls = [];
    const result = await withFetch(t, async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).includes('/businesses?')) {
        return response(200, [{ id: 'biz-a', status: 'approved', service_paused: false }]);
      }
      if (String(url).includes('/bookings')) {
        return response(201, [{ id: 'booking-1', business_id: 'biz-a', check_in_date: '2026-09-10', check_out_date: '2026-09-13', nights: 3, status: 'checked_in' }]);
      }
      throw new Error(`unexpected fetch: ${url}`);
    }, () => handler(event('POST', {
      business_id: 'biz-a',
      guest_first_name: 'Mr. John',
      guest_last_name: 'Doe',
      check_in_date: '2026-09-10',
      nights: 3,
      check_out_date: '2099-01-01'
    })));

    assert.equal(result.statusCode, 200);
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /businesses\?id=eq\.biz-a/);

    const bookingCall = calls[1];
    assert.match(bookingCall.url, /\/rest\/v1\/bookings$/);
    const payload = JSON.parse(bookingCall.options.body)[0];
    assert.equal(payload.business_id, 'biz-a');
    assert.equal(payload.guest_name, 'John Doe');
    assert.equal(payload.check_in_date, '2026-09-10');
    assert.equal(payload.nights, 3);
    assert.equal(payload.check_out_date, '2026-09-13');
    assert.equal(payload.status, 'checked_in');
  });

  await t.test('client-supplied business_id is the only tenant target and is encoded in validation', async () => {
    const { handler } = await fn();
    const calls = [];
    const result = await withFetch(t, async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).includes('/businesses?')) {
        return response(200, [{ id: 'biz-a', status: 'approved', service_paused: false }]);
      }
      return response(201, [{ id: 'booking-1', business_id: 'biz-a' }]);
    }, () => handler(event('POST', {
      business_id: 'biz-a/other',
      guest_name: 'Guest',
      check_in_date: '2026-09-10',
      nights: 1
    })));

    assert.equal(result.statusCode, 403);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /id=eq\.biz-a%2Fother/);
  });

  await t.test('client checkout date cannot override authoritative server-derived checkout', async () => {
    const { handler } = await fn();
    const calls = [];
    const result = await withFetch(t, async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).includes('/businesses?')) {
        return response(200, [{ id: 'biz-a', status: 'approved', service_paused: false }]);
      }
      return response(201, [{ id: 'booking-2', business_id: 'biz-a', check_out_date: '2026-09-15' }]);
    }, () => handler(event('POST', {
      business_id: 'biz-a',
      guest_name: 'Guest',
      check_in_date: '2026-09-10',
      nights: 5,
      check_out_date: '2026-12-31'
    })));

    assert.equal(result.statusCode, 200);
    const payload = JSON.parse(calls[1].options.body)[0];
    assert.equal(payload.check_out_date, '2026-09-15');
    assert.notEqual(payload.check_out_date, '2026-12-31');
  });
});
