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
  delete process.env.RESEND_API_KEY;
});

const { handler } = await import('../homepage-lead.js');

function mockFetch(siteverifyResult, { resourceExists = false, resendResponses = [{ status: 200, body: { id: 'test-email-id' } }] } = {}) {
  let insertCalls = 0;
  let storageExistsCalls = 0;
  let storageUploadCalls = 0;
  let storageSignCalls = 0;
  let resendCalls = 0;
  const resendRequests = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      return new Response(JSON.stringify(siteverifyResult), { status: 200 });
    }
    if (url.startsWith('https://api.resend.com/emails')) {
      resendRequests.push(JSON.parse(init.body || '{}'));
      const result = resendResponses[Math.min(resendCalls, resendResponses.length - 1)];
      resendCalls += 1;
      return new Response(JSON.stringify(result.body), { status: result.status });
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
  return () => ({ insertCalls, storageExistsCalls, storageUploadCalls, storageSignCalls, resendCalls, resendRequests });
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

test('sends the brochure confirmation email before returning modal access and records the lead', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  const calls = mockFetch({ ...validCaptcha, action: 'homepage-download' });

  const response = await handler(event({
    action: 'download',
    document: 'brochure',
    lead,
    turnstileToken: 'test-token',
  }));

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.success, true);
  assert.equal(body.emailSent, true);
  assert.equal(body.brochureUrl, '/FastCheckIn_Brochure.html');
  const result = calls();
  assert.equal(result.insertCalls, 1);
  assert.equal(result.resendCalls, 2, 'lead notification and visitor confirmation should both be sent');
  assert.ok(result.resendRequests.some(request => Array.isArray(request.to) && request.to.includes(lead.email)));
  assert.equal(result.storageExistsCalls, 0);
  assert.equal(result.storageUploadCalls, 0);
  assert.equal(result.storageSignCalls, 0);
});

test('does not offer brochure access when the visitor confirmation email fails', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  const calls = mockFetch(
    { ...validCaptcha, action: 'homepage-download' },
    { resendResponses: [
      { status: 200, body: { id: 'lead-notification-id' } },
      { status: 422, body: { message: 'Invalid recipient' } },
    ] },
  );

  const response = await handler(event({
    action: 'download',
    document: 'brochure',
    lead,
    turnstileToken: 'test-token',
  }));

  assert.equal(response.statusCode, 502);
  const body = JSON.parse(response.body);
  assert.equal(body.success, false);
  assert.match(body.error, /confirmation email/i);
  assert.equal(body.brochureUrl, undefined);
  assert.equal(calls().resendCalls, 2);
});

test('rejects unsupported HTTP methods', async () => {
  const response = await handler(event({}, 'GET'));
  assert.equal(response.statusCode, 405);
});
