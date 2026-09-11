const test = require('node:test');
const assert = require('node:assert/strict');

const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
};

function setup({
  responseStatus = 200,
  responseBody = 'business-123',
  responseJson = true,
} = {}) {
  const calls = [];

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';

  global.fetch = async (url, options) => {
    calls.push({ url, options });

    return {
      ok: responseStatus >= 200 && responseStatus < 300,
      status: responseStatus,
      async json() {
        if (!responseJson) {
          throw new Error('not json');
        }
        return responseBody;
      },
    };
  };

  delete require.cache[require.resolve('../set-password.js')];

  return {
    calls,
    loadHandler: async () => {
      const module = await import(
        `../set-password.js?test=${Date.now()}-${Math.random()}`
      );
      return module.handler;
    },
  };
}

function makeEvent(body, method = 'POST') {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
  };
}

test.afterEach(() => {
  global.fetch = originalFetch;

  if (originalEnv.SUPABASE_URL === undefined) {
    delete process.env.SUPABASE_URL;
  } else {
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
  }

  if (originalEnv.SUPABASE_SERVICE_KEY === undefined) {
    delete process.env.SUPABASE_SERVICE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_KEY = originalEnv.SUPABASE_SERVICE_KEY;
  }
});

test('OPTIONS remains public', async () => {
  const { calls, loadHandler } = setup();
  const handler = await loadHandler();

  const response = await handler({
    httpMethod: 'OPTIONS',
    body: '',
  });

  assert.equal(response.statusCode, 204);
  assert.equal(calls.length, 0);
});

test('non-POST is rejected', async () => {
  const { calls, loadHandler } = setup();
  const handler = await loadHandler();

  const response = await handler({
    httpMethod: 'GET',
    body: '',
  });

  assert.equal(response.statusCode, 405);
  assert.equal(calls.length, 0);
});

test('missing token is rejected before database access', async () => {
  const { calls, loadHandler } = setup();
  const handler = await loadHandler();

  const response = await handler(
    makeEvent({ password: 'Password123!' })
  );

  assert.equal(response.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('missing password is rejected before database access', async () => {
  const { calls, loadHandler } = setup();
  const handler = await loadHandler();

  const response = await handler(
    makeEvent({ token: 'setup-token' })
  );

  assert.equal(response.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('short password is rejected before database access', async () => {
  const { calls, loadHandler } = setup();
  const handler = await loadHandler();

  const response = await handler(
    makeEvent({
      token: 'setup-token',
      password: 'short',
    })
  );

  assert.equal(response.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('valid setup token uses the atomic password RPC', async () => {
  const { calls, loadHandler } = setup({
    responseStatus: 200,
    responseBody: 'business-123',
  });

  const handler = await loadHandler();

  const response = await handler(
    makeEvent({
      token: 'setup-token',
      password: 'Password123!',
    })
  );

  assert.equal(response.statusCode, 200);
  assert.equal(calls.length, 1);

  assert.equal(
    calls[0].url,
    'https://example.supabase.co/rest/v1/rpc/set_business_password_with_setup_token'
  );

  assert.equal(calls[0].options.method, 'POST');

  const rpcBody = JSON.parse(calls[0].options.body);

  assert.equal(rpcBody.p_token, 'setup-token');
  assert.ok(
    rpcBody.p_password_hash.startsWith('$2a$') ||
    rpcBody.p_password_hash.startsWith('$2b$') ||
    rpcBody.p_password_hash.startsWith('$2y$')
  );
});

test('invalid or expired token returns generic 400', async () => {
  const { calls, loadHandler } = setup({
    responseStatus: 400,
    responseBody: {
      message: 'INVALID_OR_EXPIRED_TOKEN',
    },
  });

  const handler = await loadHandler();

  const response = await handler(
    makeEvent({
      token: 'expired-token',
      password: 'Password123!',
    })
  );

  assert.equal(response.statusCode, 400);
  assert.match(response.body, /Invalid or expired token/);
  assert.equal(calls.length, 1);
});

test('already-used token is rejected as non-replayable', async () => {
  const { loadHandler } = setup({
    responseStatus: 400,
    responseBody: {
      message: 'TOKEN_ALREADY_USED',
    },
  });

  const handler = await loadHandler();

  const response = await handler(
    makeEvent({
      token: 'used-token',
      password: 'Password123!',
    })
  );

  assert.equal(response.statusCode, 400);
});

test('database errors do not leak internal details', async () => {
  const { loadHandler } = setup({
    responseStatus: 500,
    responseBody: {
      message: 'internal_secret_table does not exist',
    },
  });

  const handler = await loadHandler();

  const response = await handler(
    makeEvent({
      token: 'setup-token',
      password: 'Password123!',
    })
  );

  assert.equal(response.statusCode, 500);
  assert.match(response.body, /Failed to set password/);
  assert.doesNotMatch(response.body, /internal_secret_table/);
});

test('caller businessId cannot override token scope', async () => {
  const { calls, loadHandler } = setup({
    responseStatus: 200,
    responseBody: 'authoritative-business',
  });

  const handler = await loadHandler();

  const response = await handler(
    makeEvent({
      token: 'setup-token',
      password: 'Password123!',
      businessId: 'attacker-business',
    })
  );

  assert.equal(response.statusCode, 200);
  assert.equal(calls.length, 1);

  const body = JSON.parse(calls[0].options.body);

  assert.equal(body.p_token, 'setup-token');
  assert.equal(body.businessId, undefined);
});

test('handler performs exactly one atomic RPC and no direct table mutations', async () => {
  const { calls, loadHandler } = setup({
    responseStatus: 200,
    responseBody: 'business-123',
  });

  const handler = await loadHandler();

  const response = await handler(
    makeEvent({
      token: 'setup-token',
      password: 'Password123!',
    })
  );

  assert.equal(response.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.match(
    calls[0].url,
    /\/rest\/v1\/rpc\/set_business_password_with_setup_token$/
  );
});
