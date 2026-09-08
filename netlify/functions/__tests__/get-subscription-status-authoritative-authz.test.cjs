const test = require('node:test');
const assert = require('node:assert/strict');

const { handler } = require('../get-subscription-status.js');

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

function makeEvent({
  method = 'GET',
  businessId = 'business-1',
  token = null,
} = {}) {
  const queryStringParameters = {};

  if (businessId !== undefined) {
    queryStringParameters.businessId = businessId;
  }

  return {
    httpMethod: method,
    queryStringParameters,
    headers: token
      ? { authorization: `Bearer ${token}` }
      : {},
  };
}

function signJwt(payload, secret = 'test-secret') {
  const crypto = require('node:crypto');

  const encode = (value) =>
    Buffer.from(JSON.stringify(value))
      .toString('base64url');

  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

function businessToken({
  businessId = 'business-1',
  role = 'business_owner',
  permissions = [],
  employeeId = null,
} = {}) {
  return signJwt(
    {
      sub: `user-${businessId}`,
      business_id: businessId,
      role,
      permissions,
      ...(employeeId
        ? {
            user_metadata: {
              business_id: businessId,
              employee_id: employeeId,
              staff_role: role,
              permission_set: permissions,
            },
          }
        : {}),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    'test-secret'
  );
}

function platformToken({
  platformRole = 'platform_operations',
  permissions = [],
} = {}) {
  return signJwt(
    {
      sub: 'platform-user-1',
      platform_role: platformRole,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    'test-secret'
  );
}

function setupEnv() {
  process.env.SUPABASE_JWT_SECRET = 'test-secret';
  process.env.SUPER_ADMIN_JWT_ISSUER = 'fastcheckin';
  process.env.SUPER_ADMIN_JWT_AUDIENCE = 'super-admin';
}

function mockSubscriptionData({
  businessId = 'business-1',
  plan = 'growth',
  status = 'active',
} = {}) {
  const calls = [];

  global.fetch = async (url) => {
    const requestedUrl = String(url);
    calls.push(requestedUrl);

    if (requestedUrl.includes('/businesses?')) {
      return jsonResponse([
        {
          id: businessId,
          subscription_tier: plan,
          current_plan: plan,
          subscription_status: status,
          trial_end: null,
          billing_cycle: 'monthly',
        },
      ]);
    }

    if (requestedUrl.includes('/entitlements?')) {
      return jsonResponse([]);
    }

    throw new Error(`Unexpected REST request: ${requestedUrl}`);
  };

  return calls;
}

test.afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  restoreEnv();
});

test('OPTIONS remains public', async () => {
  setupEnv();

  const response = await handler(makeEvent({ method: 'OPTIONS' }));

  assert.equal(response.statusCode, 204);
});

test('non-GET methods are rejected', async () => {
  setupEnv();

  const response = await handler(makeEvent({ method: 'POST' }));

  assert.equal(response.statusCode, 405);
});

test('missing businessId is rejected before authentication/data access', async () => {
  setupEnv();

  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called');
  };

  const response = await handler(
    makeEvent({
      businessId: null,
    })
  );

  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalled, false);
});

test('missing authentication is rejected', async () => {
  setupEnv();

  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called');
  };

  const response = await handler(makeEvent());

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalled, false);
});

test('invalid JWT is rejected', async () => {
  setupEnv();

  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called');
  };

  const response = await handler(
    makeEvent({ token: 'not-a-valid-jwt' })
  );

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalled, false);
});

test('business actor without settings permission is rejected', async () => {
  setupEnv();

  const token = businessToken({
    businessId: 'business-1',
    role: 'employee',
    permissions: [],
    employeeId: 'employee-1',
  });

  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called');
  };

  const response = await handler(
    makeEvent({
      businessId: 'business-1',
      token,
    })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalled, false);
});

test('authorized business actor can access their own tenant', async () => {
  setupEnv();

  const token = businessToken({
    businessId: 'business-1',
    role: 'employee',
    permissions: ['canManageSettings'],
    employeeId: 'employee-1',
  });

  const calls = mockSubscriptionData({
    businessId: 'business-1',
  });

  const response = await handler(
    makeEvent({
      businessId: 'business-1',
      token,
    })
  );

  assert.equal(response.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /businesses\?id=eq\.business-1/);
  assert.match(calls[1], /entitlements\?business_id=eq\.business-1/);
});

test('business actor cannot override their tenant with another businessId', async () => {
  setupEnv();

  const token = businessToken({
    businessId: 'business-1',
    role: 'employee',
    permissions: ['canManageSettings'],
    employeeId: 'employee-1',
  });

  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called');
  };

  const response = await handler(
    makeEvent({
      businessId: 'business-2',
      token,
    })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalled, false);
});

test('platform actor without subscription permission is rejected', async () => {
  setupEnv();

  const token = platformToken({
    platformRole: 'platform_support',
    permissions: [],
  });

  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called');
  };

  const response = await handler(
    makeEvent({
      businessId: 'business-2',
      token,
    })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalled, false);
});

test('authorized platform actor can resolve an explicitly requested tenant', async () => {
  setupEnv();

  const token = platformToken();

  const calls = mockSubscriptionData({
    businessId: 'business-2',
  });

  const response = await handler(
    makeEvent({
      businessId: 'business-2',
      token,
    })
  );

  assert.equal(response.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /businesses\?id=eq\.business-2/);
  assert.match(calls[1], /entitlements\?business_id=eq\.business-2/);
});

test('subscription data access occurs only after authorization', async () => {
  setupEnv();

  const token = businessToken({
    businessId: 'business-1',
    role: 'employee',
    permissions: [],
    employeeId: 'employee-1',
  });

  const calls = [];

  global.fetch = async (url) => {
    calls.push(String(url));
    throw new Error('fetch should not be called');
  };

  const response = await handler(
    makeEvent({
      businessId: 'business-1',
      token,
    })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('malicious tenant override cannot escape authoritative tenant resolution', async () => {
  setupEnv();

  const token = businessToken({
    businessId: 'business-1',
    role: 'employee',
    permissions: ['canManageSettings'],
    employeeId: 'employee-1',
  });

  const calls = mockSubscriptionData({
    businessId: 'business-1',
  });

  const response = await handler(
    makeEvent({
      businessId: 'business-1',
      token,
    })
  );

  assert.equal(response.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /businesses\?id=eq\.business-1/);
  assert.match(calls[1], /entitlements\?business_id=eq\.business-1/);
  assert.ok(calls.every((url) => !url.includes('business-evil')));
});

test('internal subscription errors do not leak database details', async () => {
  setupEnv();

  const token = businessToken({
    businessId: 'business-1',
    role: 'employee',
    permissions: ['canManageSettings'],
    employeeId: 'employee-1',
  });

  const secretError =
    'SECRET database internals must never reach the client';

  global.fetch = async (url) => {
    const requestedUrl = String(url);

    if (requestedUrl.includes('/businesses?')) {
      throw new Error(secretError);
    }

    throw new Error(`Unexpected REST request: ${requestedUrl}`);
  };

  const response = await handler(
    makeEvent({
      businessId: 'business-1',
      token,
    })
  );

  assert.equal(response.statusCode, 404);

  const body = JSON.parse(response.body);

  assert.notEqual(body.error, secretError);
  assert.doesNotMatch(response.body, /SECRET database internals/);
  assert.equal(
    Object.prototype.hasOwnProperty.call(body, 'details'),
    false
  );
});
