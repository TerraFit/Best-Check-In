const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-approve-change-request-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;

function sign(payload, options = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: '15m', ...options });
}

function event(token, body = {}, method = 'POST') {
  return {
    httpMethod: method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function businessToken(businessId = 'biz-a') {
  return sign({ sub: `owner-${businessId}`, user_metadata: { business_id: businessId } });
}

function employeeToken(businessId = 'biz-a') {
  return sign({
    sub: `emp-${businessId}`,
    user_metadata: {
      business_id: businessId,
      employee_id: `emp-${businessId}`,
      staff_role: 'Manager',
      permission_set: ['canManageSettings'],
    },
  });
}

function platformToken(role = 'platform_operations') {
  return sign({ sub: 'platform-1', platform_role: role });
}

function serviceRoleToken() {
  return sign({ sub: 'service-role', role: 'service_role' });
}

function superAdminToken() {
  return sign({ sub: 'admin-1', role: 'super_admin', email: 'admin@fastcheckin.co.za' }, { issuer: 'fastcheckin', audience: 'super-admin' });
}

const baseRequest = {
  requestId: 'request-1',
  action: 'approve',
};

async function loadFunction() {
  return import(`../approve-change-request.js?test=${Date.now()}-${Math.random()}`);
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return typeof body === 'string' ? JSON.parse(body) : body; },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

function mockPendingRequest(changeRequest, calls = []) {
  return async (url, options = {}) => {
    calls.push({ url, options });

    if (url.includes('/rest/v1/change_requests?id=eq.request-1')) {
      if (options.method === 'PATCH') return response(204, '');
      return response(200, [changeRequest]);
    }

    if (url.includes('/rest/v1/businesses')) {
      if (options.method === 'PATCH') return response(200, [{ id: changeRequest.business_id }]);
      return response(200, [{ id: changeRequest.business_id, physical_address: { street: '1 Main', city: 'Gqeberha', province: 'EC', postalCode: '6001', country: 'South Africa' } }]);
    }

    return response(404, []);
  };
}

test('approve change request: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, baseRequest));
  assert.equal(result.statusCode, 401);
});

test('approve change request: invalid JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('not-a-jwt', baseRequest));
  assert.equal(result.statusCode, 401);
});

test('approve change request: expired SuperAdmin JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({ sub: 'expired', role: 'super_admin' }, { issuer: 'fastcheckin', audience: 'super-admin', expiresIn: -1 });
  const result = await handler(event(token, baseRequest));
  assert.equal(result.statusCode, 401);
});

test('approve change request: business owner is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), baseRequest));
  assert.equal(result.statusCode, 403);
});

test('approve change request: employee is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken(), baseRequest));
  assert.equal(result.statusCode, 403);
});

test('approve change request: platform actor is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(platformToken(), baseRequest));
  assert.equal(result.statusCode, 403);
});

test('approve change request: service-role token is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(serviceRoleToken(), baseRequest));
  assert.equal(result.statusCode, 403);
});

test('approve change request: metadata-only SuperAdmin spoof is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({
    sub: 'spoof',
    role: 'authenticated',
    user_metadata: { role: 'super_admin', business_id: 'biz-a' },
  });
  const result = await handler(event(token, baseRequest));
  assert.equal(result.statusCode, 403);
});

test('approve change request: missing requestId is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(superAdminToken(), { action: 'approve' }));
  assert.equal(result.statusCode, 400);
});

test('approve change request: invalid action is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(superAdminToken(), { requestId: 'request-1', action: 'delete' }));
  assert.equal(result.statusCode, 400);
});

test('approve change request: malformed JSON is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(superAdminToken(), '{bad json'));
  assert.equal(result.statusCode, 400);
  assert.doesNotMatch(result.body, /SyntaxError|Unexpected token/);
});

test('approve change request: missing request is a 404', async () => {
  const { handler } = await loadFunction();
  global.fetch = async () => response(200, []);
  const result = await handler(event(superAdminToken(), baseRequest));
  assert.equal(result.statusCode, 404);
});

test('approve change request: non-pending request is rejected', async () => {
  const { handler } = await loadFunction();
  global.fetch = mockPendingRequest({ id: 'request-1', business_id: 'biz-a', status: 'approved', field_name: 'Trading Name', requested_value: 'New Name' });
  const result = await handler(event(superAdminToken(), baseRequest));
  assert.equal(result.statusCode, 400);
});

test('approve change request: supported Trading Name field is applied', async () => {
  const { handler } = await loadFunction();
  const calls = [];
  global.fetch = mockPendingRequest({ id: 'request-1', business_id: 'biz-a', status: 'pending', field_name: 'Trading Name', requested_value: 'New Name' }, calls);
  const result = await handler(event(superAdminToken(), baseRequest));
  assert.equal(result.statusCode, 200);
  const businessPatch = calls.find(call => call.url.includes('/rest/v1/businesses') && call.options.method === 'PATCH');
  assert.deepEqual(JSON.parse(businessPatch.options.body), { trading_name: 'New Name' });
});

test('approve change request: supported Registered Name field is applied', async () => {
  const { handler } = await loadFunction();
  const calls = [];
  global.fetch = mockPendingRequest({ id: 'request-1', business_id: 'biz-a', status: 'pending', field_name: 'Registered Name', requested_value: 'New Registered Name' }, calls);
  const result = await handler(event(superAdminToken(), baseRequest));
  assert.equal(result.statusCode, 200);
  const businessPatch = calls.find(call => call.url.includes('/rest/v1/businesses') && call.options.method === 'PATCH');
  assert.deepEqual(JSON.parse(businessPatch.options.body), { registered_name: 'New Registered Name' });
});

test('approve change request: supported Slogan field is applied', async () => {
  const { handler } = await loadFunction();
  const calls = [];
  global.fetch = mockPendingRequest({ id: 'request-1', business_id: 'biz-a', status: 'pending', field_name: 'Slogan', requested_value: 'Welcome' }, calls);
  const result = await handler(event(superAdminToken(), baseRequest));
  assert.equal(result.statusCode, 200);
  const businessPatch = calls.find(call => call.url.includes('/rest/v1/businesses') && call.options.method === 'PATCH');
  assert.deepEqual(JSON.parse(businessPatch.options.body), { slogan: 'Welcome' });
});

test('approve change request: unsupported field cannot become an arbitrary business column', async () => {
  const { handler } = await loadFunction();
  let businessPatched = false;
  global.fetch = async (url, options = {}) => {
    if (url.includes('/rest/v1/change_requests?id=eq.request-1')) return response(200, [{ id: 'request-1', business_id: 'biz-a', status: 'pending', field_name: 'service_paused', requested_value: true }]);
    if (url.includes('/rest/v1/businesses') && options.method === 'PATCH') businessPatched = true;
    return response(200, [{ id: 'biz-a' }]);
  };
  const result = await handler(event(superAdminToken(), baseRequest));
  assert.equal(result.statusCode, 400);
  assert.equal(businessPatched, false);
});

test('approve change request: platform-controlled fields cannot be changed through request workflow', async () => {
  const { handler } = await loadFunction();
  for (const fieldName of ['status', 'subscription_tier', 'current_plan', 'billing_cycle', 'trial_end', 'subscription_status', 'business_id', 'id', 'created_at']) {
    let businessPatched = false;
    global.fetch = async (url, options = {}) => {
      if (url.includes('/rest/v1/change_requests?id=eq.request-1')) return response(200, [{ id: 'request-1', business_id: 'biz-a', status: 'pending', field_name: fieldName, requested_value: 'ATTACK' }]);
      if (url.includes('/rest/v1/businesses') && options.method === 'PATCH') businessPatched = true;
      return response(200, [{ id: 'biz-a' }]);
    };
    const result = await handler(event(superAdminToken(), baseRequest));
    assert.equal(result.statusCode, 400, fieldName);
    assert.equal(businessPatched, false, fieldName);
  }
});

test('approve change request: database failure is sanitized', async () => {
  const { handler } = await loadFunction();
  global.fetch = async () => response(500, 'SECRET database failure details');
  const result = await handler(event(superAdminToken(), baseRequest));
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /SECRET database failure details/);
});

test('approve change request: wrong HTTP method is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(superAdminToken(), baseRequest, 'GET'));
  assert.equal(result.statusCode, 405);
});

test('approve change request: OPTIONS remains public preflight', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, {}, 'OPTIONS'));
  assert.equal(result.statusCode, 204);
});