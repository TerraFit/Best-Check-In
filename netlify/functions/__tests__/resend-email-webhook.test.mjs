import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
const signingKey = Buffer.from('fastcheckin-test-resend-webhook-secret');
process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + signingKey.toString('base64');

const originalFetch = globalThis.fetch;
let patches = [];
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (options.method === 'GET' && target.includes('/website_email_events?')) {
    return new Response(JSON.stringify([]), { status: 200 });
  }
  if (options.method === 'GET' && target.includes('/website_enquiry_emails?')) {
    return new Response(JSON.stringify([{ id: 'email-row-1', send_status: 'sent' }]), { status: 200 });
  }
  if (options.method === 'POST' && target.includes('/website_email_events')) {
    return new Response('', { status: 201 });
  }
  if (options.method === 'PATCH' && target.includes('/website_enquiry_emails?')) {
    patches.push(JSON.parse(options.body));
    return new Response(JSON.stringify([{ id: 'email-row-1', ...JSON.parse(options.body) }]), { status: 200 });
  }
  throw new Error('Unexpected mocked fetch: ' + options.method + ' ' + target);
};

const { handler } = await import('../resend-email-webhook.js');

function signedEvent(payload, eventId = 'evt-test-1') {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', signingKey).update(`${eventId}.${timestamp}.${body}`).digest('base64');
  return {
    httpMethod: 'POST',
    headers: {
      'svix-id': eventId,
      'svix-timestamp': timestamp,
      'svix-signature': 'v1,' + signature
    },
    body
  };
}

test('rejects requests without a valid Resend signature', async () => {
  const result = await handler({ httpMethod: 'POST', headers: {}, body: '{}' });
  assert.equal(result.statusCode, 401);
});

test('records verified email-open events and updates CRM email status', async () => {
  patches = [];
  const result = await handler(signedEvent({
    type: 'email.opened',
    created_at: '2026-10-14T06:00:00.000Z',
    data: { email_id: 'resend-email-123', created_at: '2026-10-14T06:00:00.000Z' }
  }));
  assert.equal(result.statusCode, 200);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].send_status, 'opened');
  assert.equal(patches[0].opened_at, '2026-10-14T06:00:00.000Z');
});

test.after(() => { globalThis.fetch = originalFetch; });
