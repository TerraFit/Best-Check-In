import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';
process.env.TURNSTILE_SITE_KEY = 'test-turnstile-site-key';
process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'fastcheckin.co.za';
delete process.env.RESEND_API_KEY;

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const { handler } = await import('../homepage-lead.js');

function mockFetch(siteverifyResult, { resourceExists = false } = {}) {
  let insertCalls = 0;
  let storageExistsCalls = 0;
  let storageUploadCalls = 0;
  let storageSignCalls = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      return new Response(JSON.stringify(siteverifyResult), { status: 200 });
    }
    if (url.startsWith('https://supabase.test/rest/v1/website_enquiries')) {
      insertCalls += 1;
      return new Response(JSON.stringify([{ id: 'test-enquiry-id' }]), { status: 201 });
    }
    if (url.startsWith('https://supabase.test/storage/v1/object/')) {
      if (init.method === 'HEAD') {
        storageExistsCalls += 1;
        return new Response(null, { status: resourceExists ? 200 : 404 });
      }
      if (url.includes('/sign/')) {
        storageSignCalls += 1;
        return new Response(JSON.stringify({
          signedURL: '/storage/v1/object/sign/fastcheckin-marketing/FastCheckIn_Platform_Overview_Brochure.pdf?token=test-signed-token',
        }), { status: 200 });
      }
      storageUploadCalls += 1;
      return new Response(JSON.stringify({ Key: 'fastcheckin-marketing/FastCheckIn_Platform_Overview_Brochure.pdf' }), { status: 200 });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };
  return () => ({ insertCalls, storageExistsCalls, storageUploadCalls, storageSignCalls });
}

function event(body, httpMethod = 'POST') {
  return {
    httpMethod,
    headers: { 'x-forwarded-for': '203.0.113.10' },
    body: JSON.stringify(body),
  };
}

const lead = {
  fullName: 'Test User',
  companyName: 'Test Hotel',
  email: 'test@example.com',
  telephone: '+27123456789',
  address: '1 Test Street',
};

const validCaptcha = {
  success: true,
  hostname: 'fastcheckin.co.za',
  action: 'homepage-enquiry',
  challenge_ts: '2026-10-04T10:00:00.000Z',
};

test('rejects missing Turnstile token without contacting Siteverify or the database', async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called');
  };

  const response = await handler(event({
    action: 'inquiry',
    lead,
    topic: 'General enquiry',
    comments: 'Please contact me.',
  }));

  assert.equal(response.statusCode, 400);
  assert.match(JSON.parse(response.body).error, /CAPTCHA|verification/i);
  assert.equal(fetchCalled, false);
});

test('rejects a valid Turnstile response for an unapproved hostname', async () => {
  const insertCalls = mockFetch({ ...validCaptcha, hostname: 'deploy-preview-52--fastcheckin.netlify.app' });

  const response = await handler(event({
    action: 'inquiry',
    lead,
    topic: 'General enquiry',
    comments: 'Please contact me.',
    turnstileToken: 'test-token',
  }));

  assert.equal(response.statusCode, 400);
  assert.equal(insertCalls(), 0);
});

test('rejects a valid Turnstile response with the wrong action', async () => {
  const insertCalls = mockFetch({ ...validCaptcha, action: 'homepage-download' });

  const response = await handler(event({
    action: 'inquiry',
    lead,
    topic: 'General enquiry',
    comments: 'Please contact me.',
    turnstileToken: 'test-token',
  }));

  assert.equal(response.statusCode, 400);
  assert.equal(insertCalls(), 0);
});

test('accepts a verified general enquiry and persists it', async () => {
  const insertCalls = mockFetch(validCaptcha);

  const response = await handler(event({
    action: 'inquiry',
    lead,
    topic: 'General enquiry',
    comments: 'Please contact me.',
    turnstileToken: 'test-token',
  }));

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).success, true);
  assert.equal(insertCalls(), 1);
});

test('uses a separate expected action for Enterprise enquiries', async () => {
  const insertCalls = mockFetch({ ...validCaptcha, action: 'homepage-enquiry' });

  const response = await handler(event({
    action: 'enterprise-inquiry',
    lead,
    topic: 'Enterprise enquiry',
    comments: 'Please contact me about Enterprise pricing.',
    turnstileToken: 'test-token',
  }));

  assert.equal(response.statusCode, 400);
  assert.equal(insertCalls(), 0);
});

test('returns the protected PDF only after download-specific Turnstile verification and records the lead', async () => {
  const insertCalls = mockFetch({ ...validCaptcha, action: 'homepage-download' });

  const response = await handler(event({
    action: 'download',
    document: 'brochure',
    lead,
    turnstileToken: 'test-token',
  }));

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Content-Type'], 'application/json');
  const body = JSON.parse(response.body);
  assert.equal(body.success, true);
  assert.match(body.downloadUrl, /signed-token/);
  const calls = insertCalls();
  assert.equal(calls.insertCalls, 1);
  assert.equal(calls.storageExistsCalls, 1);
  assert.equal(calls.storageUploadCalls, 1);
  assert.equal(calls.storageSignCalls, 1);
});

test('reuses an existing protected PDF without uploading it again', async () => {
  const insertCalls = mockFetch({ ...validCaptcha, action: 'homepage-download' }, { resourceExists: true });

  const response = await handler(event({
    action: 'download',
    document: 'brochure',
    lead,
    turnstileToken: 'test-token',
  }));

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).success, true);
  const calls = insertCalls();
  assert.equal(calls.insertCalls, 1);
  assert.equal(calls.storageExistsCalls, 1);
  assert.equal(calls.storageUploadCalls, 0);
  assert.equal(calls.storageSignCalls, 1);
});

test('rejects unsupported HTTP methods', async () => {
  const response = await handler(event({}, 'GET'));
  assert.equal(response.statusCode, 405);
});
