const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-business-settings-authz';

const { handler } = require('../get-business-settings.js');

function sign(payload, options = {}) {
  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, { expiresIn: '15m', ...options });
}

function event(token, query = { businessId: 'biz-a' }, method = 'GET') {
  return {
    httpMethod: method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    queryStringParameters: query,
  };
}

async function bodyOf(response) {
  return JSON.parse(response.body);
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

test('business settings: anonymous request is rejected', async () => {
  const response = await handler(event(null));
  assert.equal(response.statusCode, 401);
});

test('business settings: invalid JWT is rejected', async () => {
  const response = await handler(event('not-a-jwt'));
  assert.equal(response.statusCode, 401);
});

test('business settings: expired JWT is rejected', async () => {
  const token = sign({ sub: 'expired' }, { expiresIn: -1 });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 401);
});

test('business settings: employee without canManageSettings is rejected', async () => {
  const token = employeeToken({ permissions: ['canViewRooms'] });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business settings: employee with canManageSettings reaches the data layer', async () => {
  const token = employeeToken();
  const response = await handler(event(token));
  assert.notEqual(response.statusCode, 401);
  assert.notEqual(response.statusCode, 403);
});

test('business settings: employee cannot substitute another tenant', async () => {
  const token = employeeToken({ businessId: 'biz-a' });
  const response = await handler(event(token, { businessId: 'biz-b' }));
  assert.equal(response.statusCode, 403);
});

test('business settings: business actor reaches only its own tenant', async () => {
  const token = sign({
    sub: 'business-1',
    user_metadata: { business_id: 'biz-a' },
  });
  const response = await handler(event(token));
  assert.notEqual(response.statusCode, 401);
  assert.notEqual(response.statusCode, 403);
});

test('business settings: business actor cannot substitute another tenant', async () => {
  const token = sign({
    sub: 'business-1',
    user_metadata: { business_id: 'biz-a' },
  });
  const response = await handler(event(token, { businessId: 'biz-b' }));
  assert.equal(response.statusCode, 403);
});

test('business settings: service-role JWT is rejected', async () => {
  const token = sign({ role: 'service_role', sub: 'service' });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business settings: metadata-only super_admin spoof is rejected', async () => {
  const token = sign({
    sub: 'employee-1',
    user_metadata: {
      business_id: 'biz-a',
      employee_id: 'emp-1',
      role: 'super_admin',
      permission_set: ['canManageSettings'],
    },
  });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business settings: platform actor is rejected by business-actor gate', async () => {
  const token = sign({
    sub: 'platform-1',
    platform_role: 'platform_operations',
  });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('business settings: wrong HTTP method is rejected', async () => {
  const response = await handler(event(null, { businessId: 'biz-a' }, 'POST'));
  assert.equal(response.statusCode, 405);
});

test('business settings: OPTIONS remains public preflight', async () => {
  const response = await handler(event(null, {}, 'OPTIONS'));
  assert.equal(response.statusCode, 204);
  assert.equal(response.body, '');
});

test('business settings: database errors do not expose raw error details', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const token = employeeToken();
    const response = await handler(event(token));
    const body = await bodyOf(response);
    assert.equal(response.statusCode, 500);
    assert.equal(body.error, 'Failed to fetch settings');
    assert.equal(body.details, undefined);
  } finally {
    console.error = original;
  }
});
