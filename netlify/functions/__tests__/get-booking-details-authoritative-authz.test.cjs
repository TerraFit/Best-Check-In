const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;

function sign(payload, options = {}) {
  return jwt.sign(
    payload,
    SECRET,
    {
      expiresIn: '15m',
      issuer: 'fastcheckin',
      ...options,
    },
  );
}

function businessToken(businessId = 'biz-a') {
  return sign({
    sub: `owner-${businessId}`,
    email: `owner-${businessId}@example.com`,
    user_metadata: {
      business_id: businessId,
    },
  });
}

function employeeToken(
  businessId = 'biz-a',
  permissions = ['canViewDashboard'],
) {
  return sign({
    sub: `employee-${businessId}`,
    email: `employee-${businessId}@example.com`,
    user_metadata: {
      business_id: businessId,
      employee_id: `employee-${businessId}`,
      permission_set: permissions,
    },
  });
}

function platformToken(
  platformRole = 'platform_support',
) {
  return sign({
    sub: `${platformRole}-1`,
    email: `${platformRole}@example.com`,
    platform_role: platformRole,
  });
}

function superAdminToken() {
  return sign(
    {
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'super_admin',
      user_metadata: {},
    },
    {
      audience: 'super-admin',
    },
  );
}

function event({
  token,
  bookingId = 'booking-1',
} = {}) {
  return {
    httpMethod: 'GET',
    headers: token
      ? { authorization: `Bearer ${token}` }
      : {},
    queryStringParameters:
      bookingId === undefined
        ? {}
        : { bookingId },
  };
}

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        if (name.toLowerCase() === 'content-range') return null;
        return null;
      },
    },
    async json() {
      return body;
    },
    async text() {
      return typeof body === 'string'
        ? body
        : JSON.stringify(body);
    },
  };
}

function bookingRow(businessId = 'biz-a') {
  return {
    id: 'booking-1',
    business_id: businessId,
    guest_name: 'Guest Example',
    guest_first_name: 'Guest',
    guest_last_name: 'Example',
    guest_email: 'guest@example.com',
    guest_phone: '+27123456789',
    guest_country: 'South Africa',
    guest_province: 'Western Cape',
    guest_city: 'Cape Town',
    arriving_from: 'Cape Town',
    adults: 2,
    children: 1,
    check_in_date: '2026-09-10',
    check_out_date: '2026-09-12',
    nights: 2,
    booking_source: 'direct',
    referral_source: 'website',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  };
}

function mockFetch({
  bookingBusinessId = 'biz-a',
  bookingRows = [bookingRow(bookingBusinessId)],
  restrictionRows = [],
} = {}) {
  const calls = [];

  global.fetch = async (url, options = {}) => {
    const value = String(url);
    calls.push({ url: value, options });

    if (value.includes('/bookings?')) {
      return response(bookingRows);
    }

    if (value.includes('/booking_food_restrictions?')) {
      return response(restrictionRows);
    }

    throw new Error(`Unexpected fetch URL: ${value}`);
  };

  return calls;
}

async function loadFunction() {
  return import(
    `../get-booking-details.js?test=${Date.now()}-${Math.random()}`
  );
}

test('OPTIONS remains public', async () => {
  let fetchCalls = 0;

  global.fetch = async () => {
    fetchCalls += 1;
    return response([]);
  };

  const { handler } = await loadFunction();

  const result = await handler({
    httpMethod: 'OPTIONS',
    headers: {},
    queryStringParameters: {},
  });

  assert.equal(result.statusCode, 204);
  assert.equal(fetchCalls, 0);
});

test('non-GET methods are rejected before booking access', async () => {
  let fetchCalls = 0;

  global.fetch = async () => {
    fetchCalls += 1;
    return response([]);
  };

  const { handler } = await loadFunction();

  const result = await handler({
    httpMethod: 'POST',
    headers: {},
    queryStringParameters: {},
  });

  assert.equal(result.statusCode, 405);
  assert.equal(fetchCalls, 0);
});

test('anonymous requests are rejected before booking access', async () => {
  let fetchCalls = 0;

  global.fetch = async () => {
    fetchCalls += 1;
    return response([]);
  };

  const { handler } = await loadFunction();

  const result = await handler(
    event({ bookingId: 'booking-1' }),
  );

  assert.equal(result.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('employee from another tenant cannot access booking details', async () => {
  const calls = mockFetch({
    bookingRows: [],
  });

  const { handler } = await loadFunction();

  const result = await handler(
    event({
      token: employeeToken('biz-a'),
      bookingId: 'booking-1',
    }),
  );

  assert.equal(result.statusCode, 404);
  assert.equal(calls.length, 1);

  assert.match(
    calls[0].url,
    /bookings\?id=eq\.booking-1/,
  );

  assert.match(
    calls[0].url,
    /business_id=eq\.biz-a/,
  );
});

test('authorized employee can access only their tenant booking', async () => {
  const calls = mockFetch({
    bookingBusinessId: 'biz-a',
    restrictionRows: [
      {
        id: 'restriction-1',
        booking_id: 'booking-1',
        vegan: true,
      },
    ],
  });

  const { handler } = await loadFunction();

  const result = await handler(
    event({
      token: employeeToken('biz-a'),
      bookingId: 'booking-1',
    }),
  );

  assert.equal(result.statusCode, 200);

  const body = JSON.parse(result.body);

  assert.equal(body.id, 'booking-1');
  assert.equal(body.guest_name, 'Guest Example');
  assert.equal(body.guest_email, 'guest@example.com');
  assert.deepEqual(body.food_restrictions, {
    id: 'restriction-1',
    booking_id: 'booking-1',
    vegan: true,
  });

  assert.match(
    calls[0].url,
    /business_id=eq\.biz-a/,
  );

  assert.match(
    calls[1].url,
    /booking_food_restrictions\?booking_id=eq\.booking-1/,
  );
});

test('business owner can access their own tenant booking', async () => {
  const calls = mockFetch({
    bookingBusinessId: 'biz-a',
  });

  const { handler } = await loadFunction();

  const result = await handler(
    event({
      token: businessToken('biz-a'),
      bookingId: 'booking-1',
    }),
  );

  assert.equal(result.statusCode, 200);
  assert.equal(calls.length, 2);

  assert.match(
    calls[0].url,
    /business_id=eq\.biz-a/,
  );
});

test('platform actor can intentionally access requested tenant booking', async () => {
  const calls = mockFetch({
    bookingBusinessId: 'biz-b',
  });

  const { handler } = await loadFunction();

  const result = await handler(
    event({
      token: platformToken('platform_support'),
      bookingId: 'booking-1',
    }),
  );

  assert.equal(result.statusCode, 200);
  assert.equal(calls.length, 2);

  assert.doesNotMatch(
    calls[0].url,
    /business_id=eq\.biz-a/,
  );
});

test('SuperAdmin can access requested tenant booking', async () => {
  const calls = mockFetch({
    bookingBusinessId: 'biz-b',
  });

  const { handler } = await loadFunction();

  const result = await handler(
    event({
      token: superAdminToken(),
      bookingId: 'booking-1',
    }),
  );

  assert.equal(result.statusCode, 200);
  assert.equal(calls.length, 2);
});

test('missing booking returns 404 without querying restrictions', async () => {
  const calls = mockFetch({
    bookingRows: [],
  });

  const { handler } = await loadFunction();

  const result = await handler(
    event({
      token: businessToken('biz-a'),
      bookingId: 'missing-booking',
    }),
  );

  assert.equal(result.statusCode, 404);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /bookings\?id=eq\.missing-booking/);
});

test('missing booking ID returns 400 before database access', async () => {
  let fetchCalls = 0;

  global.fetch = async () => {
    fetchCalls += 1;
    return response([]);
  };

  const { handler } = await loadFunction();

  const result = await handler({
    httpMethod: 'GET',
    headers: {
      authorization: `Bearer ${businessToken('biz-a')}`,
    },
    queryStringParameters: {},
  });

  assert.equal(result.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('oversized booking ID returns 400 before database access', async () => {
  let fetchCalls = 0;

  global.fetch = async () => {
    fetchCalls += 1;
    return response([]);
  };

  const { handler } = await loadFunction();

  const result = await handler(
    event({
      token: businessToken('biz-a'),
      bookingId: 'x'.repeat(201),
    }),
  );

  assert.equal(result.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('business actor without dashboard permission is rejected', async () => {
  let fetchCalls = 0;

  global.fetch = async () => {
    fetchCalls += 1;
    return response([]);
  };

  const { handler } = await loadFunction();

  const token = sign({
    sub: 'employee-1',
    user_metadata: {
      business_id: 'biz-a',
      employee_id: 'employee-1',
      permission_set: [],
    },
  });

  const result = await handler(
    event({
      token,
      bookingId: 'booking-1',
    }),
  );

  assert.equal(result.statusCode, 403);
  assert.equal(fetchCalls, 0);
});
