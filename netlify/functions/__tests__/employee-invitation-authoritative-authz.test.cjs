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

function event({ method = 'GET', token, body } = {}) {
  return {
    httpMethod: method,
    queryStringParameters: token === undefined ? {} : { token },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

test('get employee by token: missing token is rejected', async () => {
  const handler = await loadHandler('get-employee-by-token');
  const result = await handler(event());
  assert.equal(result.statusCode, 400);
});

test('get employee by token: database errors are sanitized', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => response(500, { message: 'secret database detail' });
  try {
    const handler = await loadHandler('get-employee-by-token');
    const result = await handler(event({ token: 'invite-token' }));
    assert.equal(result.statusCode, 500);
    assert.equal(JSON.parse(result.body).error, 'Unable to verify invitation');
    assert.equal(result.body.includes('secret database detail'), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('get employee by token: response excludes invitation credential and password fields', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.includes('/businesses?')) return response(200, [{ trading_name: 'Test Lodge' }]);
    return response(200, [{
      id: 'emp-1',
      business_id: 'biz-a',
      full_name: 'Test Employee',
      phone_number: '0712345678',
      role: 'EmployeeOverview',
      status: 'Pending',
      invitation_token: 'secret-token',
      password_hash: 'secret-hash',
      invitation_expiry: new Date(Date.now() + 3600000).toISOString(),
      invited_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  };
  try {
    const handler = await loadHandler('get-employee-by-token');
    const result = await handler(event({ token: 'invite-token' }));
    assert.equal(result.statusCode, 200);
    const data = JSON.parse(result.body);
    assert.equal(data.employee.invitation_token, undefined);
    assert.equal(data.employee.password_hash, undefined);
    assert.equal(data.employee.full_name, 'Test Employee');
    assert.equal(data.businessName, 'Test Lodge');
  } finally {
    global.fetch = originalFetch;
  }
});

test('activate employee: malformed JSON is rejected', async () => {
  const handler = await loadHandler('activate-employee');
  const result = await handler({ httpMethod: 'POST', headers: {}, body: '{' });
  assert.equal(result.statusCode, 400);
});

test('activate employee: database errors are sanitized', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => response(500, { message: 'secret database detail' });
  try {
    const handler = await loadHandler('activate-employee');
    const result = await handler(event({ method: 'POST', body: { token: 'invite-token', password: 'Password1!' } }));
    assert.equal(result.statusCode, 500);
    assert.equal(JSON.parse(result.body).error, 'Unable to verify invitation');
    assert.equal(result.body.includes('secret database detail'), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('activate employee: concurrent-safe update is constrained to pending invitation token', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (options?.method === 'PATCH') {
      return response(200, [{
        id: 'emp-1',
        full_name: 'Test Employee',
        phone_number: '0712345678',
        role: 'EmployeeOverview',
        status: 'Active',
      }]);
    }
    return response(200, [{
      id: 'emp-1',
      business_id: 'biz-a',
      full_name: 'Test Employee',
      phone_number: '0712345678',
      role: 'EmployeeOverview',
      status: 'Pending',
      invitation_expiry: new Date(Date.now() + 3600000).toISOString(),
    }]);
  };
  try {
    const handler = await loadHandler('activate-employee');
    const result = await handler(event({ method: 'POST', body: { token: 'invite-token', password: 'Password1!' } }));
    assert.equal(result.statusCode, 200);
    const patch = calls.find(call => call.options?.method === 'PATCH');
    assert.ok(patch);
    assert.match(patch.url, /status=eq\.Pending/);
    assert.match(patch.url, /invitation_token=eq\.invite-token/);
    const patchBody = JSON.parse(patch.options.body);
    assert.equal(patchBody.invitation_token, null);
    assert.equal(JSON.parse(result.body).employee.status, 'Active');
  } finally {
    global.fetch = originalFetch;
  }
});
