const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-change-request-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.RESEND_API_KEY = '';

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

function employeeToken(businessId = 'biz-a', permissions = ['canManageSettings']) {
  return sign({
    sub: `emp-${businessId}`,
    user_metadata: {
      business_id: businessId,
      employee_id: `emp-${businessId}`,
      staff_role: 'Manager',
      permission_set: permissions,
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
  return sign({ sub: 'admin-1', role: 'super_admin' }, { issuer: 'fastcheckin', audience: 'super-admin' });
}

const baseBody = {
  businessId: 'biz-a',
  businessName: 'Client Supplied Name',
  fieldName: 'Trading Name',
  currentValue: 'Client Supplied Current Value',
  requestedValue: 'New Trading Name',
  reason: 'Legal update',
  attachments: [],
  status: 'pending',
};

async function loadFunction() {
  return import(`../submit-change-request.js?test=${Date.now()}-${Math.random()}`);
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return typeof body === 'string' ? JSON.parse(body) : body; },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

function mockBusinessAndInsert(calls = []) {
  return async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/rest/v1/businesses?')) {
      return response(200, [{
        id: 'biz-a',
        trading_name: 'Old Trading Name',
        registered_name: 'Old Registered Name',
        legal_name: 'Old Legal Name',
        slogan: 'Old Slogan',
        total_rooms: 6,
        avg_price: 1200,
        directors: [{ name: 'Existing Director' }],
      }]);
    }
    if (url.includes('/rest/v1/change_requests')) {
      return response(201, [{ id: 'request-1', status: 'pending' }]);
    }
    return response(404, []);
  };
}

test('change request: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, baseBody));
  assert.equal(result.statusCode, 401);
});

test('change request: invalid JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('not-a-jwt', baseBody));
  assert.equal(result.statusCode, 401);
});

test('change request: expired JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({ sub: 'expired', user_metadata: { business_id: 'biz-a' } }, { expiresIn: -1 });
  const result = await handler(event(token, baseBody));
  assert.equal(result.statusCode, 401);
});

test('change request: employee without settings permission is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a', ['canViewRooms']), baseBody));
  assert.equal(result.statusCode, 403);
});

test('change request: employee cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { ...baseBody, businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('change request: platform actor is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(platformToken(), baseBody));
  assert.equal(result.statusCode, 403);
});

test('change request: service-role token is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(serviceRoleToken(), baseBody));
  assert.equal(result.statusCode, 403);
});

test('change request: SuperAdmin is rejected from business endpoint', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(superAdminToken(), baseBody));
  assert.equal(result.statusCode, 403);
});

test('change request: metadata-only SuperAdmin spoof is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({
    sub: 'spoof',
    role: 'authenticated',
    user_metadata: {
      business_id: 'biz-a',
      employee_id: 'emp-a',
      staff_role: 'Manager',
      role: 'super_admin',
      permission_set: ['canManageSettings'],
    },
  });
  const result = await handler(event(token, baseBody));
  assert.equal(result.statusCode, 403);
});

test('change request: business owner is allowed without permission metadata', async () => {
  const { handler } = await loadFunction();
  const calls = [];
  global.fetch = mockBusinessAndInsert(calls);
  const result = await handler(event(businessToken(), baseBody));
  assert.equal(result.statusCode, 200);
  const inserted = calls.find(call => call.url.includes('/rest/v1/change_requests'));
  const payload = JSON.parse(inserted.options.body);
  assert.equal(payload.business_id, 'biz-a');
  assert.equal(payload.business_name, 'Old Trading Name');
  assert.equal(payload.current_value, 'Old Trading Name');
});

test('change request: authorized employee is tenant-bound and ignores client identity fields', async () => {
  const { handler } = await loadFunction();
  const calls = [];
  global.fetch = mockBusinessAndInsert(calls);
  const result = await handler(event(employeeToken(), { ...baseBody, businessName: 'ATTACKER NAME', currentValue: 'ATTACKER CURRENT' }));
  assert.equal(result.statusCode, 200);
  const inserted = calls.find(call => call.url.includes('/rest/v1/change_requests'));
  const payload = JSON.parse(inserted.options.body);
  assert.equal(payload.business_id, 'biz-a');
  assert.equal(payload.business_name, 'Old Trading Name');
  assert.equal(payload.current_value, 'Old Trading Name');
});

test('change request: missing businessId is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), { ...baseBody, businessId: undefined }));
  assert.equal(result.statusCode, 400);
});

test('change request: unsupported field cannot be requested', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), { ...baseBody, fieldName: 'service_paused' }));
  assert.equal(result.statusCode, 400);
});

test('change request: arbitrary status cannot bypass pending workflow', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), { ...baseBody, status: 'approved' }));
  assert.equal(result.statusCode, 400);
});

test('change request: malformed JSON is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), '{bad json'));
  assert.equal(result.statusCode, 400);
});

test('change request: business lookup failure is sanitized', async () => {
  const { handler } = await loadFunction();
  global.fetch = async () => response(500, 'SECRET business lookup details');
  const result = await handler(event(businessToken(), baseBody));
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /SECRET business lookup details/);
});

test('change request: insert failure is sanitized', async () => {
  const { handler } = await loadFunction();
  global.fetch = async (url) => {
    if (url.includes('/rest/v1/businesses?')) return response(200, [{ id: 'biz-a', trading_name: 'Old Trading Name' }]);
    return response(500, 'SECRET insert details');
  };
  const result = await handler(event(businessToken(), baseBody));
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /SECRET insert details/);
});

test('change request: wrong HTTP method is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), baseBody, 'GET'));
  assert.equal(result.statusCode, 405);
});

test('change request: OPTIONS remains public preflight', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, {}, 'OPTIONS'));
  assert.equal(result.statusCode, 204);
});
