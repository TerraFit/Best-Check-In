const test = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_ENV = { ...process.env };
const originalFetch = global.fetch;

function loadHandler() {
  const path = require.resolve('../save-guest-profile.js');
  delete require.cache[path];
  return require(path).handler;
}

function event({
  method = 'POST',
  email,
  businessId,
  bookingId,
  profileData = {},
} = {}) {
  return {
    httpMethod: method,
    body: JSON.stringify({
      ...(email !== undefined ? { email } : {}),
      ...(businessId !== undefined ? { businessId } : {}),
      ...(bookingId !== undefined ? { bookingId } : {}),
      profileData,
    }),
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function setConfiguredEnv() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
}

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = originalFetch;
}

test.afterEach(restoreEnv);

test('OPTIONS remains public', async () => {
  setConfiguredEnv();
  const handler = loadHandler();

  const response = await handler(event({ method: 'OPTIONS' }));

  assert.equal(response.statusCode, 204);
});

test('non-POST methods are rejected', async () => {
  setConfiguredEnv();

  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const handler = loadHandler();
  const response = await handler(event({
    method: 'GET',
    email: 'guest@example.com',
    businessId: 'biz-a',
    bookingId: 'booking-1',
  }));

  assert.equal(response.statusCode, 405);
  assert.equal(fetchCalls, 0);
});

test('missing email is rejected before data-layer access', async () => {
  setConfiguredEnv();

  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const handler = loadHandler();
  const response = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      businessId: 'biz-a',
      bookingId: 'booking-1',
      profileData: {},
    }),
  });

  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('missing businessId is rejected before data-layer access', async () => {
  setConfiguredEnv();

  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const handler = loadHandler();
  const response = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      email: 'guest@example.com',
      bookingId: 'booking-1',
      profileData: {},
    }),
  });

  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('missing bookingId is rejected before data-layer access', async () => {
  setConfiguredEnv();

  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse([]);
  };

  const handler = loadHandler();
  const response = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      email: 'guest@example.com',
      businessId: 'biz-a',
      profileData: {},
    }),
  });

  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test('unknown booking is rejected before profile upsert', async () => {
  setConfiguredEnv();

  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return jsonResponse([]);
  };

  const handler = loadHandler();
  const response = await handler(event({
    email: 'guest@example.com',
    businessId: 'biz-a',
    bookingId: 'booking-unknown',
  }));

  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /bookings\?/);
  assert.match(urls[0], /id=eq\.booking-unknown/);
  assert.match(urls[0], /business_id=eq\.biz-a/);
});

test('booking belonging to another business cannot be used', async () => {
  setConfiguredEnv();

  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));

    return jsonResponse([{
      id: 'booking-1',
      business_id: 'biz-other',
      guest_email: 'guest@example.com',
      status: 'confirmed',
    }]);
  };

  const handler = loadHandler();
  const response = await handler(event({
    email: 'guest@example.com',
    businessId: 'biz-a',
    bookingId: 'booking-1',
  }));

  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /business_id=eq\.biz-a/);
});

test('submitted email must match the authoritative booking email', async () => {
  setConfiguredEnv();

  const urls = [];
  global.fetch = async (url, options) => {
    urls.push({
      url: String(url),
      options,
    });

    if (urls.length === 1) {
      return jsonResponse([{
        id: 'booking-1',
        business_id: 'biz-a',
        guest_email: 'real-guest@example.com',
        status: 'confirmed',
      }]);
    }

    return jsonResponse({ id: 'unexpected-profile-write' });
  };

  const handler = loadHandler();
  const response = await handler(event({
    email: 'attacker@example.com',
    businessId: 'biz-a',
    bookingId: 'booking-1',
    profileData: {
      fullName: 'Attacker',
    },
  }));

  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
  assert.match(urls[0].url, /bookings\?/);
});

test('email matching is normalized before authoritative comparison', async () => {
  setConfiguredEnv();

  const urls = [];
  global.fetch = async (url, options) => {
    urls.push({
      url: String(url),
      options,
    });

    if (urls.length === 1) {
      return jsonResponse([{
        id: 'booking-1',
        business_id: 'biz-a',
        guest_email: 'guest@example.com',
        status: 'confirmed',
      }]);
    }

    return jsonResponse({
      email: 'guest@example.com',
      full_name: 'Jane Doe',
    });
  };

  const handler = loadHandler();
  const response = await handler(event({
    email: '  Guest@Example.COM ',
    businessId: 'biz-a',
    bookingId: 'booking-1',
    profileData: {
      fullName: 'Jane Doe',
    },
  }));

  assert.equal(response.statusCode, 200);
  assert.equal(urls.length, 3);
  assert.match(urls[0].url, /bookings\?/);
  assert.match(urls[0].url, /business_id=eq\.biz-a/);
  assert.match(urls[0].url, /id=eq\.booking-1/);
  assert.match(urls[1].url, /guest_profiles\?/);
  assert.match(urls[1].url, /select=total_visits/);
  assert.match(urls[2].url, /guest_profiles\?/);
  assert.match(urls[2].url, /on_conflict=email/);
});

test('authorized save is tenant-bound and only occurs after booking validation', async () => {
  setConfiguredEnv();

  const urls = [];
  global.fetch = async (url, options) => {
    urls.push({
      url: String(url),
      options,
    });

    if (urls.length === 1) {
      return jsonResponse([{
        id: 'booking-1',
        business_id: 'biz-a',
        guest_email: 'guest@example.com',
        status: 'confirmed',
      }]);
    }

    return jsonResponse({
      email: 'guest@example.com',
      full_name: 'Jane Doe',
    });
  };

  const handler = loadHandler();
  const response = await handler(event({
    email: 'guest@example.com',
    businessId: 'biz-a',
    bookingId: 'booking-1',
    profileData: {
      fullName: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      country: 'CH',
    },
  }));

  assert.equal(response.statusCode, 200);
  assert.equal(urls.length, 3);

  assert.match(urls[0].url, /bookings\?/);
  assert.match(urls[0].url, /id=eq\.booking-1/);
  assert.match(urls[0].url, /business_id=eq\.biz-a/);

  assert.match(urls[1].url, /guest_profiles\?/);
  assert.match(urls[1].url, /select=total_visits/);

  assert.match(urls[2].url, /guest_profiles\?/);
  assert.match(urls[2].url, /on_conflict=email/);

  const writeBody = JSON.parse(urls[2].options.body);
  assert.equal(writeBody.email, 'guest@example.com');
  assert.equal(writeBody.full_name, 'Jane Doe');
});

test('booking validation failure prevents profile mutation', async () => {
  setConfiguredEnv();

  const urls = [];
  global.fetch = async () => {
    urls.push('fetch');
    return {
      ok: false,
      status: 503,
      json: async () => ({}),
    };
  };

  const handler = loadHandler();
  const response = await handler(event({
    email: 'guest@example.com',
    businessId: 'biz-a',
    bookingId: 'booking-1',
  }));

  assert.equal(response.statusCode, 502);
  assert.equal(urls.length, 1);
});

test('malicious business override cannot escape the booking tenant', async () => {
  setConfiguredEnv();

  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));

    if (urls.length === 1) {
      return jsonResponse([{
        id: 'booking-a',
        business_id: 'biz-a',
        guest_email: 'guest@example.com',
        status: 'confirmed',
      }]);
    }

    return jsonResponse({
      email: 'guest@example.com',
    });
  };

  const handler = loadHandler();
  const response = await handler(event({
    email: 'guest@example.com',
    businessId: 'biz-b',
    bookingId: 'booking-a',
  }));

  assert.equal(response.statusCode, 403);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /business_id=eq\.biz-b/);
});
