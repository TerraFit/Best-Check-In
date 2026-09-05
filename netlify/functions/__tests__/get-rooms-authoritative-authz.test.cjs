const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

function loadHandler() {
  const path = require.resolve('../get-rooms.js');
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

test('anonymous requests are rejected before room access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const response = await loadHandler()(event({ businessId: 'biz-a' }));

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('invalid JWT is rejected before room access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: 'not-a-jwt'
    })
  );

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('expired JWT is rejected before room access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const expired = jwt.sign(
    {
      sub: 'user-1',
      user_metadata: {
        business_id: 'biz-a',
        active: true
      },
      exp: Math.floor(Date.now() / 1000) - 60
    },
    process.env.SUPABASE_JWT_SECRET
  );

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: expired
    })
  );

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('tenant substitution is rejected before room access', async () => {
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

test('missing business scope is rejected before room access', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const noBusinessToken = jwt.sign(
    {
      sub: 'user-1',
      email: 'user@example.com',
      user_metadata: {
        active: true
      }
    },
    process.env.SUPABASE_JWT_SECRET
  );

  const response = await loadHandler()(
    event({ token: noBusinessToken })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('inactive employee is rejected before room access', async () => {
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
        active: false,
        permissionSet: ['canViewRooms']
      })
    })
  );

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('employee without room-view permission is rejected before room access', async () => {
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

test('authorized business actor is tenant-bound', async () => {
  const urls = [];

  global.fetch = async (url) => {
    urls.push(String(url));

    if (String(url).includes('/rooms?')) {
      return jsonResponse([
        {
          id: 'room-a',
          business_id: 'biz-a',
          room_number: 1,
          active: true
        }
      ]);
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
  assert.match(urls[0], /business_id=eq\.biz-a/);

  const body = JSON.parse(response.body);
  assert.equal(body.success, true);
  assert.equal(body.rooms[0].business_id, 'biz-a');
});

test('authorized employee with canViewRooms can list rooms', async () => {
  global.fetch = async () =>
    jsonResponse([
      {
        id: 'room-a',
        business_id: 'biz-a',
        room_number: 1,
        active: true
      }
    ]);

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: token({
        businessId: 'biz-a',
        role: 'employee',
        employeeId: 'employee-1',
        permissionSet: ['canViewRooms']
      })
    })
  );

  assert.equal(response.statusCode, 200);
});

test('includeInactive remains tenant-bound', async () => {
  const urls = [];

  global.fetch = async (url) => {
    urls.push(String(url));

    if (String(url).includes('/rooms?')) {
      return jsonResponse([
        {
          id: 'room-a',
          business_id: 'biz-a',
          room_number: 1,
          active: false
        }
      ]);
    }

    return jsonResponse([]);
  };

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      extra: { includeInactive: 'true' },
      token: token({ businessId: 'biz-a' })
    })
  );

  assert.equal(response.statusCode, 200);
  assert.match(urls[0], /business_id=eq\.biz-a/);
  assert.match(urls[0], /includeInactive|rooms\?/);
  assert.ok(!urls[0].includes('biz-other'));
});

test('booking occupancy query is tenant-scoped', async () => {
  const urls = [];

  global.fetch = async (url) => {
    urls.push(String(url));

    if (String(url).includes('/rooms?')) {
      return jsonResponse([
        {
          id: 'room-a',
          business_id: 'biz-a',
          room_number: 1,
          active: true
        }
      ]);
    }

    if (String(url).includes('/bookings?')) {
      return jsonResponse([]);
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

  const bookingUrl = urls.find((url) => url.includes('/bookings?'));
  assert.ok(bookingUrl);
  assert.match(bookingUrl, /business_id=eq\.biz-a/);
  assert.ok(!bookingUrl.includes('biz-other'));
});

test('room data-layer failure does not expose room data', async () => {
  global.fetch = async () =>
    jsonResponse({ error: 'database failure' }, 500);

  const response = await loadHandler()(
    event({
      businessId: 'biz-a',
      token: token({ businessId: 'biz-a' })
    })
  );

  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /Room A|room-a/);
});

test('booking lookup failure cannot expose booking data', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('/rooms?')) {
      return jsonResponse([
        {
          id: 'room-a',
          business_id: 'biz-a',
          room_number: 1,
          active: true
        }
      ]);
    }

    if (String(url).includes('/bookings?')) {
      return jsonResponse({ error: 'database failure' }, 500);
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

  const body = JSON.parse(response.body);
  assert.equal(body.rooms[0].business_id, 'biz-a');
  assert.doesNotMatch(response.body, /biz-other/);
});
