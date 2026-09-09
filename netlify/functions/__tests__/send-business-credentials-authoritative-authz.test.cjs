const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-send-business-credentials-authz';
process.env.FASTCHECKIN_JWT_ISSUER = 'fastcheckin';

const { handler } = require('../send-business-credentials.js');

function sign(payload, options = {}) {
  return jwt.sign(
    payload,
    process.env.SUPABASE_JWT_SECRET,
    {
      issuer: process.env.FASTCHECKIN_JWT_ISSUER,
      expiresIn: '15m',
      ...options,
    },
  );
}

function event(token, body = { businessId: 'biz-a' }, method = 'POST') {
  return {
    httpMethod: method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  };
}

function businessOwnerToken(businessId = 'biz-a') {
  return sign({
    sub: `business-${businessId}`,
    user_metadata: {
      business_id: businessId,
    },
  });
}

function employeeToken({
  businessId = 'biz-a',
  permissions = ['canManageSettings'],
  role = 'administration',
  employeeId = 'emp-1',
} = {}) {
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

function platformToken(platformRole = 'platform_operations') {
  return sign({
    sub: `platform-${platformRole}`,
    platform_role: platformRole,
  });
}

test('send business credentials: anonymous request is rejected', async () => {
  const response = await handler(event(null));
  assert.equal(response.statusCode, 401);
});

test('send business credentials: invalid JWT is rejected', async () => {
  const response = await handler(event('not-a-jwt'));
  assert.equal(response.statusCode, 401);
});

test('send business credentials: business owner is allowed', async () => {
  const response = await handler(event(businessOwnerToken()));
  assert.notEqual(response.statusCode, 401);
  assert.notEqual(response.statusCode, 403);
});

test('send business credentials: authorized platform actor is allowed', async () => {
  const response = await handler(event(platformToken()));
  assert.notEqual(response.statusCode, 401);
  assert.notEqual(response.statusCode, 403);
});

test('send business credentials: administration employee with canManageSettings is rejected', async () => {
  const response = await handler(event(employeeToken()));
  assert.equal(response.statusCode, 403);
});

test('send business credentials: general manager employee is rejected despite broad permissions', async () => {
  const response = await handler(event(employeeToken({
    role: 'general_manager',
    permissions: [
      'canManageSettings',
      'canManageStaff',
      'canViewDashboard',
      'canExportReports',
    ],
  })));
  assert.equal(response.statusCode, 403);
});

test('send business credentials: employee without settings permission is rejected', async () => {
  const response = await handler(event(employeeToken({
    permissions: ['canViewDashboard'],
  })));
  assert.equal(response.statusCode, 403);
});

test('send business credentials: employee cannot target another tenant', async () => {
  const response = await handler(
    event(employeeToken({
      businessId: 'biz-a',
      permissions: ['canManageSettings'],
    }), {
      businessId: 'biz-b',
    }),
  );
  assert.equal(response.statusCode, 403);
});

test('send business credentials: business owner cannot target another tenant', async () => {
  const response = await handler(
    event(businessOwnerToken('biz-a'), {
      businessId: 'biz-b',
    }),
  );
  assert.equal(response.statusCode, 403);
});

test('send business credentials: service-role JWT is rejected', async () => {
  const token = sign({
    role: 'service_role',
    sub: 'service',
  });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('send business credentials: metadata-only super_admin spoof is rejected', async () => {
  const token = sign({
    sub: 'employee-1',
    user_metadata: {
      business_id: 'biz-a',
      employee_id: 'emp-1',
      role: 'super_admin',
      super_admin: true,
      permission_set: ['canManageSettings'],
    },
  });
  const response = await handler(event(token));
  assert.equal(response.statusCode, 403);
});

test('send business credentials: wrong HTTP method is rejected', async () => {
  const response = await handler(
    event(businessOwnerToken(), { businessId: 'biz-a' }, 'GET'),
  );
  assert.equal(response.statusCode, 405);
});

test('send business credentials: OPTIONS remains public preflight', async () => {
  const response = await handler(
    event(null, {}, 'OPTIONS'),
  );
  assert.equal(response.statusCode, 204);
  assert.equal(response.body, '');
});
