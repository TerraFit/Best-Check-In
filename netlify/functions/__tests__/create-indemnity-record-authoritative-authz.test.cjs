const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

function loadHandler() {
  const path = require.resolve('../create-indemnity-record.ts');
  delete require.cache[path];
  return require(path).handler;
}

function event(body) {
  return {
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify(body),
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

const validBody = {
  booking_id: 'booking-a',
  business_id: 'biz-a',
  guest_name: 'Client Name',
  guest_first_name: 'Client',
  guest_last_name: 'Name',
  passport_or_id: 'ID-123',
  signature_data: 'data:image/png;base64,signature',
  indemnity_text: 'terms'
};

test('missing booking or business scope is rejected before database access', async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; return jsonResponse([]); };
  const response = await loadHandler()(event({ signature_data: 'sig' }));
  assert.equal(response.statusCode, 400);
  assert.equal(calls, 0);
});

test('booking/business mismatch is rejected before indemnity insertion', async () => {
  const urls = [];
  global.fetch = async (url, options) => {
    urls.push({ url: String(url), options });
    if (String(url).includes('/bookings?')) return jsonResponse([]);
    throw new Error('indemnity insert must not be reached');
  };

  const response = await loadHandler()(event(validBody));
  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
  assert.match(urls[0].url, /business_id=eq\.biz-a/);
  assert.match(urls[0].url, /id=eq\.booking-a/);
});

test('valid booking is checked before indemnity insertion and client identity is not authoritative', async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/bookings?')) {
      return jsonResponse([{
        id: 'booking-a',
        business_id: 'biz-a',
        guest_name: 'Authoritative Name',
        guest_first_name: 'Authoritative',
        guest_last_name: 'Name',
        status: 'confirmed'
      }]);
    }
    return jsonResponse([{ access_token: 'persisted-token' }]);
  };

  const response = await loadHandler()(event({ ...validBody, guest_name: 'Attacker Supplied Name' }));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).access_token, 'persisted-token');

  const insert = calls.find((call) => call.url.includes('/indemnity_records'));
  assert.ok(insert);
  const record = JSON.parse(insert.options.body)[0];
  assert.equal(record.guest_name, 'Authoritative Name');
  assert.equal(record.guest_first_name, 'Authoritative');
  assert.equal(record.guest_last_name, 'Name');
  assert.equal(record.signed_at !== validBody.signed_at, true);
});

test('upstream errors are not returned to the public caller', async () => {
  global.fetch = async () => jsonResponse({ error: 'secret database connection details' }, 500);
  const response = await loadHandler()(event(validBody));
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /secret database connection details/);
});
