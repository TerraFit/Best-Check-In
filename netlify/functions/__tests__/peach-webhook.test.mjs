import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const { handler } = await import('../peach-webhook.js');

test('GET health check returns 200 without exposing configuration', async () => {
  const result = await handler({ httpMethod: 'GET' });
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).service, 'peach-webhook');
});

test('non-POST methods are rejected', async () => {
  const result = await handler({ httpMethod: 'PUT' });
  assert.equal(result.statusCode, 405);
});

test('Peach verificationCode probe receives 200 and is not treated as a payment', async () => {
  const result = await handler({
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ verificationCode: 'probe-test' }),
  });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { received: true });
});

test('unsigned non-probe POST is not acknowledged when secret is not configured', async () => {
  const original = process.env.PEACH_WEBHOOK_SECRET;
  delete process.env.PEACH_WEBHOOK_SECRET;
  try {
    const result = await handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'Succeeded' }),
    });
    assert.equal(result.statusCode, 503);
  } finally {
    if (original === undefined) delete process.env.PEACH_WEBHOOK_SECRET;
    else process.env.PEACH_WEBHOOK_SECRET = original;
  }
});

test('signed webhook is persisted before it receives a 200 acknowledgement', async () => {
  const originalSecret = process.env.PEACH_WEBHOOK_SECRET;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_KEY;
  const originalFetch = global.fetch;
  const secret = 'unit-test-secret';
  process.env.PEACH_WEBHOOK_SECRET = secret;
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_KEY = 'service-test-key';

  const timestamp = '1793275200';
  const webhookId = 'evt-test-1';
  const rawBody = JSON.stringify({ status: 'Succeeded', profileId: 'profile-test' });
  const url = 'https://fastcheckin.co.za/.netlify/functions/peach-webhook';
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${webhookId}.${url}.${rawBody}`).digest('hex');
  let inserted = false;
  global.fetch = async (_url, options) => {
    inserted = true;
    assert.equal(options.method, 'POST');
    const rows = JSON.parse(options.body);
    assert.equal(rows[0].webhook_id, webhookId);
    return { ok: true, status: 201, text: async () => '' };
  };

  try {
    const result = await handler({
      httpMethod: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-timestamp': timestamp,
        'x-webhook-id': webhookId,
        'x-webhook-signature-algorithm': 'HMAC-SHA256',
        'x-webhook-signature': signature,
      },
      body: rawBody,
    });
    assert.equal(result.statusCode, 200);
    assert.equal(inserted, true);
  } finally {
    global.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.PEACH_WEBHOOK_SECRET; else process.env.PEACH_WEBHOOK_SECRET = originalSecret;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = originalKey;
  }
});


test('Orchestration webhook event is persisted using event_id without Checkout HMAC headers', async () => {
  const originalSecret = process.env.PEACH_WEBHOOK_SECRET;
  const originalToken = process.env.PEACH_WEBHOOK_AUTH_TOKEN;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_KEY;
  const originalFetch = global.fetch;
  delete process.env.PEACH_WEBHOOK_SECRET;
  delete process.env.PEACH_WEBHOOK_AUTH_TOKEN;
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_KEY = 'service-test-key';

  let inserted = false;
  global.fetch = async (_url, options) => {
    inserted = true;
    const rows = JSON.parse(options.body);
    assert.equal(rows[0].webhook_id, 'evt-orchestration-test');
    assert.equal(rows[0].event_type, 'payment_succeeded');
    return { ok: true, status: 201, text: async () => '' };
  };

  try {
    const result = await handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event_id: 'evt-orchestration-test',
        event_type: 'payment_succeeded',
        timestamp: '2026-10-29T10:00:00Z',
        content: { status: 'Succeeded', profile_id: 'pro-test' },
      }),
    });
    assert.equal(result.statusCode, 200);
    assert.equal(inserted, true);
  } finally {
    global.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.PEACH_WEBHOOK_SECRET; else process.env.PEACH_WEBHOOK_SECRET = originalSecret;
    if (originalToken === undefined) delete process.env.PEACH_WEBHOOK_AUTH_TOKEN; else process.env.PEACH_WEBHOOK_AUTH_TOKEN = originalToken;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = originalKey;
  }
});
