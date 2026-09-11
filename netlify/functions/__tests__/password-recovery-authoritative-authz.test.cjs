const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';
process.env.RESEND_API_KEY = 'resend-test-key';

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() { return body; },
  async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
});

async function loadHandler(name) {
  const mod = await import(`../${name}.js?test=${Date.now()}-${Math.random()}`);
  return mod.handler;
}

function event({ method = 'POST', body } = {}) {
  return {
    httpMethod: method,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

test('update password: missing token is rejected before database access', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return response(500, { message: 'must not be called' });
  };
  try {
    const handler = await loadHandler('update-password');
    const result = await handler(event({ body: { password: 'Password1!' } }));
    assert.equal(result.statusCode, 400);
    assert.equal(JSON.parse(result.body).error, 'Token and password required');
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('update password: password reset is authorized and completed by one RPC transaction', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/reset_business_password_with_token');
    assert.equal(options.method, 'POST');
    return response(200, '00000000-0000-0000-0000-000000000001');
  };
  try {
    const handler = await loadHandler('update-password');
    const result = await handler(event({ body: { token: 'valid-token', password: 'Password1!' } }));
    assert.equal(result.statusCode, 200);
    assert.equal(JSON.parse(result.body).success, true);
    assert.equal(calls.length, 1);

    const payload = JSON.parse(calls[0].options.body);
    assert.equal(payload.p_token, 'valid-token');
    assert.match(payload.p_password_hash, /^\$2[aby]?\$/);
    assert.equal(Object.keys(payload).sort().join(','), 'p_password_hash,p_token');
  } finally {
    global.fetch = originalFetch;
  }
});

test('update password: caller cannot select or override a business tenant', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return response(200, '00000000-0000-0000-0000-000000000001');
  };
  try {
    const handler = await loadHandler('update-password');
    const result = await handler(event({
      body: {
        token: 'valid-token',
        password: 'Password1!',
        businessId: 'attacker-business',
        business_id: 'attacker-business'
      }
    }));
    assert.equal(result.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.includes('/businesses?'), false);
    const payload = JSON.parse(calls[0].options.body);
    assert.equal(Object.prototype.hasOwnProperty.call(payload, 'businessId'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(payload, 'business_id'), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('update password: database errors are sanitized and no fallback mutation is attempted', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return response(500, { message: 'secret database detail' });
  };
  try {
    const handler = await loadHandler('update-password');
    const result = await handler(event({ body: { token: 'valid-token', password: 'Password1!' } }));
    assert.equal(result.statusCode, 500);
    assert.equal(JSON.parse(result.body).error, 'Failed to reset password');
    assert.equal(result.body.includes('secret database detail'), false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.includes('/businesses?'), false);
    assert.equal(calls[0].url.includes('/password_resets?'), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('request password reset: generated token has high entropy and authoritative business binding', async () => {
  const originalFetch = global.fetch;
  let inserted;
  global.fetch = async (url, options) => {
    if (url.includes('/businesses?')) {
      return response(200, [{ id: 'biz-a', trading_name: 'Test Lodge', email: 'owner@example.com' }]);
    }
    if (url.includes('/password_resets') && options?.method === 'POST') {
      inserted = JSON.parse(options.body);
      return response(201, []);
    }
    if (url.includes('api.resend.com')) return response(200, { id: 'email-1' });
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    const handler = await loadHandler('request-password-reset');
    const result = await handler(event({ body: { email: 'OWNER@example.com' } }));
    assert.equal(result.statusCode, 200);
    assert.ok(inserted);
    assert.equal(typeof inserted.token, 'string');
    assert.ok(inserted.token.length >= 43);
    assert.equal(inserted.business_id, 'biz-a');
    assert.equal(inserted.email, 'owner@example.com');
  } finally {
    global.fetch = originalFetch;
  }
});
