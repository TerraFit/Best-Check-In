const test = require('node:test');
const { mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { pathToFileURL } = require('node:url');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';
process.env.SUPER_ADMIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPER_ADMIN_JWT_AUDIENCE = 'super-admin';

function token(claims = {}) {
  return jwt.sign({
    sub: 'user-1',
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'https://example.supabase.co/auth/v1',
    user_metadata: { business_id: 'biz-a', ...claims.user_metadata },
    ...claims,
  }, process.env.SUPABASE_JWT_SECRET, { expiresIn: '1h' });
}

function event({
  auth,
  body = JSON.stringify({ businessId: 'biz-a' }),
  method = 'DELETE',
} = {}) {
  return {
    httpMethod: method,
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
    body,
  };
}

function makeSupabaseMock({
  deleteError = null,
  cleanupError = null,
  calls = [],
} = {}) {
  function table(name) {
    return {
      delete() {
        calls.push({ operation: 'delete', table: name });

        return {
          eq(column, value) {
            calls[calls.length - 1].column = column;
            calls[calls.length - 1].value = value;

            return Promise.resolve(
              name === 'businesses'
                ? { error: deleteError }
                : { error: cleanupError }
            );
          },
        };
      },
    };
  }

  return {
    from: table,
    calls,
  };
}

async function invoke({
  auth,
  body,
  method,
  supabaseOptions,
} = {}) {
  const calls = [];
  const supabaseMock = makeSupabaseMock({
    ...(supabaseOptions || {}),
    calls,
  });

  mock.module('@supabase/supabase-js', {
    cache: false,
    namedExports: {
      createClient() {
        return supabaseMock;
      },
    },
  });

  const moduleUrl = pathToFileURL(
    require.resolve('../delete-business.js')
  );
  moduleUrl.search = `test=${Date.now()}-${Math.random()}`;

  try {
    const { handler } = await import(moduleUrl.href);

    return {
      response: await handler(event({ auth, body, method })),
      calls,
    };
  } finally {
    mock.reset();
  }
}

const superAdmin = token({
  role: 'super_admin',
  iss: process.env.SUPER_ADMIN_JWT_ISSUER,
  aud: process.env.SUPER_ADMIN_JWT_AUDIENCE,
  user_metadata: {},
});

const platformOperations = token({
  platform_role: 'platform_operations',
  user_metadata: {},
});

const platformSupport = token({
  platform_role: 'platform_support',
  user_metadata: {},
});

const business = token({
  user_metadata: { business_id: 'biz-a' },
});

const employee = token({
  user_metadata: {
    business_id: 'biz-a',
    employee_id: 'emp-1',
    staff_role: 'Manager',
  },
});

const spoofedSuperAdmin = token({
  user_metadata: {
    business_id: 'biz-a',
    role: 'super_admin',
  },
});

const serviceRole = token({
  role: 'service_role',
  platform_role: 'platform_operations',
  user_metadata: {},
});

const expired = jwt.sign({
  sub: 'expired',
  role: 'super_admin',
  aud: process.env.SUPER_ADMIN_JWT_AUDIENCE,
  iss: process.env.SUPER_ADMIN_JWT_ISSUER,
}, process.env.SUPABASE_JWT_SECRET, { expiresIn: -1 });

test('anonymous request is rejected before database access', async () => {
  const { response, calls } = await invoke();

  assert.equal(response.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('invalid JWT is rejected before database access', async () => {
  const { response, calls } = await invoke({
    auth: 'not-a-valid-token',
  });

  assert.equal(response.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('expired SuperAdmin JWT is rejected before database access', async () => {
  const { response, calls } = await invoke({
    auth: expired,
  });

  assert.equal(response.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('business owner cannot permanently delete a business', async () => {
  const { response, calls } = await invoke({
    auth: business,
  });

  assert.equal(response.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('employee cannot permanently delete a business', async () => {
  const { response, calls } = await invoke({
    auth: employee,
  });

  assert.equal(response.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('platform actor without businesses write permission is rejected', async () => {
  const { response, calls } = await invoke({
    auth: platformSupport,
  });

  assert.equal(response.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('metadata-only SuperAdmin spoof is rejected', async () => {
  const { response, calls } = await invoke({
    auth: spoofedSuperAdmin,
  });

  assert.equal(response.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('service-role token is rejected as an application identity', async () => {
  const { response, calls } = await invoke({
    auth: serviceRole,
  });

  assert.equal(response.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('missing businessId is rejected before database mutation', async () => {
  const { response, calls } = await invoke({
    auth: superAdmin,
    body: JSON.stringify({}),
  });

  assert.equal(response.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('malformed JSON is rejected before database mutation', async () => {
  const { response, calls } = await invoke({
    auth: superAdmin,
    body: '{bad json',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('successful deletion targets exactly the requested business', async () => {
  const { response, calls } = await invoke({
    auth: superAdmin,
    body: JSON.stringify({ businessId: 'biz-target' }),
  });

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).success, true);

  assert.deepEqual(calls, [
    {
      operation: 'delete',
      table: 'businesses',
      column: 'id',
      value: 'biz-target',
    },
    {
      operation: 'delete',
      table: 'email_verifications',
      column: 'business_id',
      value: 'biz-target',
    },
    {
      operation: 'delete',
      table: 'setup_tokens',
      column: 'business_id',
      value: 'biz-target',
    },
  ]);
});

test('platform operations actor with businesses write permission may delete', async () => {
  const { response, calls } = await invoke({
    auth: platformOperations,
    body: JSON.stringify({ businessId: 'biz-platform' }),
  });

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).success, true);
  assert.equal(calls[0].table, 'businesses');
  assert.equal(calls[0].value, 'biz-platform');
});

test('business deletion database failure is sanitized', async () => {
  const { response } = await invoke({
    auth: superAdmin,
    supabaseOptions: {
      deleteError: {
        message: 'SECRET database internals',
      },
    },
  });

  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /SECRET database internals/);
});

test('cleanup database failures do not expose internal details', async () => {
  const { response, calls } = await invoke({
    auth: superAdmin,
    supabaseOptions: {
      cleanupError: {
        message: 'SECRET cleanup internals',
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).success, true);
  assert.doesNotMatch(response.body, /SECRET cleanup internals/);
});

test('wrong HTTP method is rejected', async () => {
  const { response, calls } = await invoke({
    auth: superAdmin,
    method: 'POST',
  });

  assert.equal(response.statusCode, 405);
  assert.equal(calls.length, 0);
});

test('OPTIONS preflight remains public', async () => {
  const { response, calls } = await invoke({
    method: 'OPTIONS',
  });

  assert.equal(response.statusCode, 204);
  assert.equal(calls.length, 0);
});
