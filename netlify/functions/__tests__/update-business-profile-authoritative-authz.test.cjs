const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-business-profile-authz';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const { handler } = require('../update-business-profile.js');

function sign(payload, options = {}) {
  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, { expiresIn: '15m', ...options });
}

function employeeToken({ businessId = 'biz-a', permissions = ['canManageSettings'], role = 'Manager', employeeId = 'emp-1' } = {}) {
  return sign({
    sub: employeeId,
    email: `${employeeId}@example.com`,
    user_metadata: {
      business_id: businessId,
      employee_id: employeeId,
      staff_role: role,
      permission_set: permissions,
    },
  });
}

function event(token, body = { businessId: 'biz-a', trading_name: 'Updated Name' }, method = 'POST') {
  return {
    httpMethod: method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  };
}

async function withFetchMock(response, callback) {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (...args) => {
    calls.push(args);
    return response;
  };
  try {
    return await callback(calls);
  } finally {
    global.fetch = originalFetch;
  }
}

function okResponse(data = [{ id: 'biz-a', trading_name: 'Updated Name' }]) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
  };
}

function errorResponse(status = 500, text = 'internal database details') {
  return {
    ok: false,
    status,
    text: async () => text,
  };
}

test('update business profile: anonymous request is rejected', async () => {
  const response = await handler(event(null));
  assert.equal(response.statusCode, 401);
});

test('update business profile: invalid JWT is rejected', async () => {
  const response = await handler(event('not-a-jwt'));
  assert.equal(response.statusCode, 401);
});

test('update business profile: expired JWT is rejected', async () => {
  const token = sign({ sub: 'expired' }, { expiresIn: -1 });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 401);
});

test('update business profile: employee without canManageSettings is rejected', async () => {
  const token = employeeToken({ permissions: ['canViewRooms'] });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('update business profile: authorized employee reaches the data layer', async () => {
  const token = employeeToken();
  await withFetchMock(okResponse(), async (calls) => {
    const response = await handler(event(token));
    assert.equal(response.statusCode, 200);
    assert.equal(calls.length, 1);
  });
});

test('update business profile: employee cannot substitute another tenant', async () => {
  const token = employeeToken({ businessId: 'biz-a' });
  const response = await handler(event(token, { businessId: 'biz-b', trading_name: 'Attack' }));
  assert.equal(response.statusCode, 403);
});

test('update business profile: business actor reaches only its own tenant', async () => {
  const token = sign({
    sub: 'owner-a',
    email: 'owner-a@example.com',
    user_metadata: { business_id: 'biz-a', permission_set: ['canManageSettings'] },
  });
  await withFetchMock(okResponse(), async (calls) => {
    const response = await handler(event(token, { businessId: 'biz-a', trading_name: 'Owner Update' }));
    assert.equal(response.statusCode, 200);
    assert.match(calls[0][0], /businesses\?id=eq\.biz-a$/);
  });
});

test('update business profile: business actor cannot substitute another tenant', async () => {
  const token = sign({
    sub: 'owner-a',
    email: 'owner-a@example.com',
    user_metadata: { business_id: 'biz-a', permission_set: ['canManageSettings'] },
  });
  const response = await handler(event(token, { businessId: 'biz-b', trading_name: 'Attack' }));
  assert.equal(response.statusCode, 403);
});

test('update business profile: service-role JWT is rejected', async () => {
  const token = sign({ role: 'service_role', sub: 'service-role' });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('update business profile: metadata-only super_admin spoof is rejected', async () => {
  const token = sign({
    sub: 'spoof',
    user_metadata: { role: 'super_admin', business_id: 'biz-a', permission_set: ['canManageSettings'] },
  });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('update business profile: platform actor is rejected by business-actor gate', async () => {
  const token = sign({
    sub: 'platform-1',
    platform_role: 'platform_analytics',
  });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('update business profile: wrong HTTP method is rejected', async () => {
  const response = await handler(event(null, { businessId: 'biz-a', trading_name: 'Nope' }, 'GET'));
  assert.equal(response.statusCode, 405);
});

test('update business profile: OPTIONS remains public preflight', async () => {
  const response = await handler(event(null, {}, 'OPTIONS'));
  assert.equal(response.statusCode, 204);
  assert.equal(response.body, '');
});

test('update business profile: unknown fields cannot be written', async () => {
  const token = employeeToken();
  const response = await handler(event(token, { businessId: 'biz-a', subscription_tier: 'enterprise' }));
  assert.equal(response.statusCode, 400);
});

test('update business profile: platform-controlled fields are filtered from the write', async () => {
  const token = employeeToken();
  const response = await withFetchMock(okResponse(), async (calls) => {
    const result = await handler(event(token, {
      businessId: 'biz-a',
      trading_name: 'Safe Name',
      status: 'suspended',
      service_paused: true,
      subscription_tier: 'enterprise',
      current_plan: 'enterprise',
      billing_cycle: 'annual',
      registered_name: 'Attacker Legal Name',
      legal_name: 'Attacker Legal Name',
    }));
    assert.equal(result.statusCode, 200);
    const [url, options] = calls[0];
    assert.equal(url, 'https://test.supabase.co/rest/v1/businesses?id=eq.biz-a');
    const sent = JSON.parse(options.body);
    assert.equal(sent.trading_name, 'Safe Name');
    assert.equal(sent.status, undefined);
    assert.equal(sent.service_paused, undefined);
    assert.equal(sent.subscription_tier, undefined);
    assert.equal(sent.current_plan, undefined);
    assert.equal(sent.billing_cycle, undefined);
    assert.equal(sent.registered_name, undefined);
    assert.equal(sent.legal_name, undefined);
    assert.equal(typeof sent.updated_at, 'string');
    return result;
  });
  assert.equal(response.statusCode, 200);
});

test('update business profile: tenant ID is taken from authenticated principal', async () => {
  const token = employeeToken({ businessId: 'biz-a' });
  await withFetchMock(okResponse(), async (calls) => {
    const response = await handler(event(token, { businessId: 'biz-a', trading_name: 'Tenant A' }));
    assert.equal(response.statusCode, 200);
    assert.match(calls[0][0], /businesses\?id=eq\.biz-a$/);
  });
});

test('update business profile: invalid JSON is rejected without data-layer access', async () => {
  const token = employeeToken();
  const originalFetch = global.fetch;
  let called = false;
  global.fetch = async () => { called = true; return okResponse(); };
  try {
    const response = await handler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: '{invalid-json',
    });
    assert.equal(response.statusCode, 400);
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('update business profile: database errors are sanitized', async () => {
  const token = employeeToken();
  await withFetchMock(errorResponse(500, 'SECRET database schema and credentials'), async () => {
    const response = await handler(event(token));
    assert.equal(response.statusCode, 500);
    assert.equal(response.body, JSON.stringify({ success: false, error: 'Failed to update business profile' }));
    assert.doesNotMatch(response.body, /SECRET|schema|credentials/);
  });
});

test('update business profile: successful response preserves expected success shape', async () => {
  const token = employeeToken();
  await withFetchMock(okResponse([{ id: 'biz-a', trading_name: 'Updated Name' }]), async () => {
    const response = await handler(event(token));
    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.success, true);
    assert.equal(body.message, 'Profile updated successfully');
    assert.deepEqual(body.updatedFields, ['trading_name', 'updated_at']);
    assert.equal(body.data.id, 'biz-a');
  });
});
