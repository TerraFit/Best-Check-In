const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

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

test('update password: invalid token cannot change password', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return response(200, []);
  };
  try {
    const handler = await loadHandler('update-password');
    const result = await handler(event({ body: { token: 'invalid-token', password: 'Password1!' } }));
    assert.equal(result.statusCode, 400);
    assert.equal(JSON.parse(result.body).error, 'Invalid or expired token');
    assert.equal(calls.some(call => call.options?.method === 'PATCH'), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('update password: token consumption is conditional and occurs before password mutation', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (!options?.method) {
      return response(200, [{ id: 'reset-1', business_id: 'biz-a' }]);
    }
    if (url.includes('password_resets?') && options.method === 'PATCH') {
      return response(200, [{ id: 'reset-1' }]);
    }
    if (url.includes('businesses?') && options.method === 'PATCH') {
      return response(200, []);
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    const handler = await loadHandler('update-password');
    const result = await handler(event({ body: { token: 'valid-token', password: 'Password1!' } }));
    assert.equal(result.statusCode, 200);

    const resetPatch = calls.find(call => call.options?.method === 'PATCH' && call.url.includes('password_resets?'));
    const businessPatch = calls.find(call => call.options?.method === 'PATCH' && call.url.includes('businesses?'));
    assert.ok(resetPatch);
    assert.ok(businessPatch);
    assert.match(resetPatch.url, /id=eq\.reset-1/);
    assert.match(resetPatch.url, /used_at=is\.null/);
    assert.deepEqual(JSON.parse(resetPatch.options.body), { used_at: assert.match ? JSON.parse(resetPatch.options.body).used_at && JSON.parse(resetPatch.options.body) : null });
    assert.ok(new Date(JSON.parse(resetPatch.options.body).used_at).getTime() > 0);
    assert.ok(calls.indexOf(resetPatch) < calls.indexOf(businessPatch));
    assert.match(businessPatch.url, /id=eq\.biz-a/);
    assert.equal(JSON.parse(result.body).success, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('update password: already-consumed token cannot mutate business password', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (!options?.method) return response(200, [{ id: 'reset-1', business_id: 'biz-a' }]);
    if (url.includes('password_resets?') && options.method === 'PATCH') return response(200, []);
    return response(500, { message: 'business password update must not run' });
  };
  try {
    const handler = await loadHandler('update-password');
    const result = await handler(event({ body: { token: 'valid-token', password: 'Password1!' } }));
    assert.equal(result.statusCode, 400);
    assert.equal(JSON.parse(result.body).error, 'Invalid or expired token');
    assert.equal(calls.some(call => call.options?.method === 'PATCH' && call.url.includes('businesses?')), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('update password: database details are not exposed to the client', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => response(500, { message: 'secret database detail' });
  try {
    const handler = await loadHandler('update-password');
    const result = await handler(event({ body: { token: 'valid-token', password: 'Password1!' } }));
    assert.equal(result.statusCode, 500);
    assert.equal(JSON.parse(result.body).error, 'Failed to reset password');
    assert.equal(result.body.includes('secret database detail'), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('request password reset: generated token has high entropy', async () => {
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
