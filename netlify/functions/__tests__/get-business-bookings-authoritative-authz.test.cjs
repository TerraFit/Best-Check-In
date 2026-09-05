const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

function loadHandler() {
  const path = require.resolve('../get-business-bookings.js');
  delete require.cache[path];
  return require(path).handler;
}

function event({ method = 'GET', businessId, token, extra = {} } = {}) {
  const queryStringParameters = { ...extra };
  if (businessId !== undefined) queryStringParameters.businessId = businessId;

  return {
    httpMethod: method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    queryStringParameters
  };
}

function token({
  businessId = 'biz-a',
  role,
  permissionSet,
  employeeId,
  active = true
} = {}) {
  const userMetadata = {
    business_id: businessId,
    active
  };

  if (employeeId) userMetadata.employee_id = employeeId;
  if (employeeId) userMetadata.employee_id = employeeId;
  if (employeeId) userMetadata.employee_id = employeeId;
  if (permissionSet) userMetadata.permission_set = permissionSet;

  const payload = {
    sub: 'user-1',
    email: 'user@example.com',
    user_metadata: userMetadata
  };

  if (role) payload.role = role;

  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET);
}

function jsonResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        const key = Object.keys(headers).find(
          (candidate) => candidate.toLowerCase() === name.toLowerCase()
        );
        return key ? headers[key] : null;
      }
    },
    async json() {
      return body;
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    }
  };
}

test('OPTIONS remains public', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const response = await loadHandler()(event({ method: 'OPTIONS' }));

  assert.equal(response.statusCode, 204);
  assert.equal(fetchCalls, 0);
});

test('non-GET methods are rejected', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const response = await loadHandler()(event({ method: 'POST' }));

  assert.equal(response.statusCode, 405);
  assert.equal(fetchCalls, 0);
});

test('anonymous requests are rejected before booking access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const response = await loadHandler()(event({ businessId: 'biz-a' }));

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('invalid JWT is rejected before booking access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const response = await loadHandler()(
    event({ businessId: 'biz-a', token: 'not-a-jwt' })
  );

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('expired JWT is rejected before booking access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const expired = jwt.sign(
    {
      sub: 'user-1',
      user_metadata: { business_id: 'biz-a', active: true },
      exp: Math.floor(Date.now() / 1000) - 60
    },
    process.env.SUPABASE_JWT_SECRET
  );

  const response = await loadHandler()(
    event({ businessId: 'biz-a', token: expired })
  );

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('tenant substitution is rejected before booking access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const response = await loadHandler()(
    event({
      businessId: 'biz-other',
      token: token({ businessId: 'biz-a' })
    })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('missing business scope is rejected before booking access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const noBusinessToken = jwt.sign(
    {
      sub: 'user-1',
      email: 'user@example.com',
      user_metadata: { active: true }
    },
    process.env.SUPABASE_JWT_SECRET
  );

  const response = await loadHandler()(
    event({ token: noBusinessToken })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('inactive employee is rejected before booking access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: token({
        businessId: 'biz-a',
        active: false,
        permissionSet: ['canManageBookings']
      })
    })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('employee without booking-view permission is rejected before booking access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: token({
        businessId: 'biz-a',
        role: 'employee',
        employeeId: 'employee-1',
        permissionSet: []
      })
    })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('authorized business actor is tenant-bound and can list bookings', async () => {
  const urls = [];

  global.fetch = async (url) => {
    urls.push(String(url));
    return jsonResponse(
      [
        {
          id: 'booking-1',
          business_id: 'biz-a',
          guest_name: 'Guest A'
        }
      ],
      200,
      { 'content-range': '0-0/1' }
    );
  };

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: token({ businessId: 'biz-a' })
    })
  );

  assert.equal(response.statusCode, 200);
  assert.match(urls[0], /business_id=eq\.biz-a/);

  const body = JSON.parse(response.body);
  assert.equal(body.success, true);
  assert.equal(body.bookings[0].business_id, 'biz-a');
});

test('authorized employee with booking-view permission can list bookings', async () => {
  global.fetch = async () =>
    jsonResponse(
      [{ id: 'booking-1', business_id: 'biz-a', guest_name: 'Guest A' }],
      200,
      { 'content-range': '0-0/1' }
    );

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: token({
        businessId: 'biz-a',
        role: 'employee',
        employeeId: 'employee-1',
        permissionSet: ['canManageBookings']
      })
    })
  );

  assert.equal(response.statusCode, 200);
});

test('food restrictions access remains scoped to the authorized booking set', async () => {
  const urls = [];

  global.fetch = async (url) => {
    urls.push(String(url));

    if (String(url).includes('/bookings?')) {
      return jsonResponse(
        [{ id: 'booking-1', business_id: 'biz-a', guest_name: 'Guest A' }],
        200,
        { 'content-range': '0-0/1' }
      );
    }

    return jsonResponse([]);
  };

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: token({ businessId: 'biz-a' })
    })
  );

  assert.equal(response.statusCode, 200);
  assert.ok(urls.every((url) => !url.includes('business_id=eq.biz-other')));
});

test('booking data-layer failure does not expose booking data', async () => {
  global.fetch = async () => jsonResponse({ error: 'database failure' }, 500);

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: token({ businessId: 'biz-a' })
    })
  );

  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /Guest A/);
});
