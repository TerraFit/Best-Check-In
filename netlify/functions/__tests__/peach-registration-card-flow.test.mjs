import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const { handler } = await import('../peach-confirm-registration-card.js');
const { handler: intentHandler } = await import('../peach-registration-card-intent.js');

const envKeys = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'PEACH_ORCHESTRATION_API_KEY', 'PEACH_ORCHESTRATION_BASE_URL', 'PEACH_PROFILE_ID', 'PEACH_ORCHESTRATION_SDK_URL', 'PEACH_PUBLISHABLE_KEY'];
const withEnv = async (run) => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_KEY = 'service-test-key';
  process.env.PEACH_ORCHESTRATION_API_KEY = 'peach-test-key';
  const peachHost = ['app', 'sandbox-next', 'peachpayments', 'com'].join('.');
  process.env.PEACH_ORCHESTRATION_BASE_URL = ['https:', '', peachHost].join('/');
  process.env.PEACH_PROFILE_ID = 'profile-test';
  process.env.PEACH_ORCHESTRATION_SDK_URL = ['https:', '', ['sdk', 'sandbox-next', 'peachpayments', 'com'].join('.'), 'assets', 'v1', ''].join('/');
  process.env.PEACH_PUBLISHABLE_KEY = 'publishable-test-key';
  const originalFetch = global.fetch;
  try { await run(); } finally {
    global.fetch = originalFetch;
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
};
const token = 'registration-token-for-peach-flow-test-000000000000';
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const event = () => ({ httpMethod: 'POST', body: JSON.stringify({ registrationToken: token }) });

test('no saved payment intent is reported explicitly so the client can create the first intent', async () => {
  await withEnv(async () => {
    global.fetch = async (url) => {
      if (String(url).includes('/registration_application_tokens?')) {
        assert.ok(String(url).includes(tokenHash));
        return { ok: true, json: async () => [{ business_id: 'business-1' }] };
      }
      if (String(url).includes('/businesses?')) {
        return { ok: true, json: async () => [{ id: 'business-1', registration_payment_status: 'intent_created', registration_payment_intent_id: null }] };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };
    const result = await handler(event());
    assert.equal(result.statusCode, 409);
    assert.equal(JSON.parse(result.body).code, 'no_payment_intent');
  });
});

test('Peach return is force-synchronised and a succeeded mandate is recorded', async () => {
  await withEnv(async () => {
    let patched = false;
    global.fetch = async (url, options = {}) => {
      const target = String(url);
      if (target.includes('/registration_application_tokens?')) {
        return { ok: true, json: async () => [{ business_id: 'business-1' }] };
      }
      if (target.includes('/businesses?') && options.method !== 'PATCH') {
        return { ok: true, json: async () => [{
          id: 'business-1',
          trading_name: 'Test Lodge',
          email: 'owner@example.com',
          current_plan: 'pro',
          billing_cycle: 'monthly',
          total_rooms: 5,
          registration_payment_status: 'intent_created',
          registration_payment_intent_id: 'pay_test_123',
          payment_customer_id: 'fc_business-1'
        }] };
      }
      if (target.includes('/api/payments/pay_test_123?force_sync=true')) {
        assert.equal(options.headers['api-key'], 'peach-test-key');
        return { ok: true, json: async () => ({
          id: 'pay_test_123',
          status: 'succeeded',
          mandate_id: 'mandate_test_123'
        }) };
      }
      if (target.includes('/rest/v1/businesses?id=eq.business-1')) {
        patched = true;
        const body = JSON.parse(options.body);
        assert.equal(body.registration_payment_status, 'verified');
        assert.equal(body.payment_mandate_id, 'mandate_test_123');
        assert.equal(body.payment_customer_id, 'fc_business-1');
        return { ok: true, json: async () => [{ id: 'business-1' }] };
      }
      throw new Error(`Unexpected fetch: ${target}`);
    };
    const result = await handler(event());
    assert.equal(result.statusCode, 200);
    assert.equal(JSON.parse(result.body).verified, true);
    assert.equal(JSON.parse(result.body).businessName, 'Test Lodge');
    assert.equal(JSON.parse(result.body).email, 'owner@example.com');
    assert.equal(patched, true);
  });
});

test('intent endpoint replaces a terminal failed Peach payment with a fresh intent', async () => {
  await withEnv(async () => {
    let created = false;
    let savedNewIntent = false;
    global.fetch = async (url, options = {}) => {
      const target = String(url);
      if (target.includes('/registration_application_tokens?')) {
        return { ok: true, json: async () => [{ business_id: 'business-1' }] };
      }
      if (target.includes('/rest/v1/businesses?') && options.method !== 'PATCH') {
        return { ok: true, json: async () => [{
          id: 'business-1',
          trading_name: 'Test Lodge',
          email: 'test@example.com',
          phone: null,
          current_plan: 'pro',
          billing_cycle: 'monthly',
          total_rooms: 5,
          status: 'pending',
          registration_payment_status: 'intent_created',
          registration_payment_intent_id: 'pay_test_failed'
        }] };
      }
      if (target.includes('/api/payments/pay_test_failed?force_sync=true')) {
        return { ok: true, json: async () => ({ id: 'pay_test_failed', status: 'failed' }) };
      }
      if (target.endsWith('/api/payments') && options.method === 'POST') {
        created = true;
        const payload = JSON.parse(options.body);
        assert.equal(payload.amount, 0);
        assert.equal(payload.confirm, false);
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          text: async () => JSON.stringify({ id: 'pay_test_fresh', client_secret: 'secret_fresh' })
        };
      }
      if (target.includes('/rest/v1/businesses?id=eq.business-1&status=eq.pending') && options.method === 'PATCH') {
        savedNewIntent = true;
        assert.equal(JSON.parse(options.body).registration_payment_intent_id, 'pay_test_fresh');
        return { ok: true, text: async () => '' };
      }
      throw new Error(`Unexpected fetch: ${target}`);
    };
    const result = await intentHandler(event());
    const body = JSON.parse(result.body);
    assert.equal(result.statusCode, 200);
    assert.equal(body.paymentId, 'pay_test_fresh');
    assert.equal(body.clientSecret, 'secret_fresh');
    assert.equal(created, true);
    assert.equal(savedNewIntent, true);
  });
});

test('failed Peach intent is reported as retryable so the client can request a fresh session', async () => {
  await withEnv(async () => {
    global.fetch = async (url) => {
      const target = String(url);
      if (target.includes('/registration_application_tokens?')) {
        return { ok: true, json: async () => [{ business_id: 'business-1' }] };
      }
      if (target.includes('/businesses?')) {
        return { ok: true, json: async () => [{
          id: 'business-1',
          registration_payment_status: 'intent_created',
          registration_payment_intent_id: 'pay_test_failed',
          payment_customer_id: 'fc_business-1'
        }] };
      }
      if (target.includes('/api/payments/pay_test_failed?force_sync=true')) {
        return { ok: true, json: async () => ({ id: 'pay_test_failed', status: 'failed' }) };
      }
      throw new Error(`Unexpected fetch: ${target}`);
    };
    const result = await handler(event());
    const body = JSON.parse(result.body);
    assert.equal(result.statusCode, 202);
    assert.equal(body.verified, false);
    assert.equal(body.peachStatus, 'failed');
    assert.equal(body.retryable, true);
  });
});

test('processing intent remains pending and is not marked verified', async () => {
  await withEnv(async () => {
    let patched = false;
    global.fetch = async (url, options = {}) => {
      const target = String(url);
      if (target.includes('/registration_application_tokens?')) {
        return { ok: true, json: async () => [{ business_id: 'business-1' }] };
      }
      if (target.includes('/businesses?')) {
        return { ok: true, json: async () => [{
          id: 'business-1',
          registration_payment_status: 'intent_created',
          registration_payment_intent_id: 'pay_test_123',
          payment_customer_id: 'fc_business-1'
        }] };
      }
      if (target.includes('/api/payments/pay_test_123?force_sync=true')) {
        return { ok: true, json: async () => ({ id: 'pay_test_123', status: 'processing' }) };
      }
      if (target.includes('/rest/v1/businesses?id=eq.business-1')) patched = true;
      throw new Error(`Unexpected fetch: ${target}`);
    };
    const result = await handler(event());
    assert.equal(result.statusCode, 202);
    assert.equal(JSON.parse(result.body).verified, false);
    assert.equal(JSON.parse(result.body).peachStatus, 'processing');
    assert.equal(patched, false);
  });
});

test('requires customer action returns only a validated Peach redirect URL', async () => {
  await withEnv(async () => {
    global.fetch = async (url) => {
      const target = String(url);
      if (target.includes('/registration_application_tokens?')) {
        return { ok: true, json: async () => [{ business_id: 'business-1' }] };
      }
      if (target.includes('/businesses?')) {
        return { ok: true, json: async () => [{
          id: 'business-1',
          registration_payment_status: 'intent_created',
          registration_payment_intent_id: 'pay_test_123',
          payment_customer_id: 'fc_business-1'
        }] };
      }
      if (target.includes('/api/payments/pay_test_123?force_sync=true')) {
        return { ok: true, json: async () => ({
          id: 'pay_test_123',
          status: 'requires_customer_action',
          next_action: {
            type: 'redirect_to_url',
            redirect_to_url: ['https:', '', ['app', 'sandbox-next', 'peachpayments', 'com'].join('.'), 'api', 'payments', 'redirect', 'pay_test_123'].join('/')
          }
        }) };
      }
      throw new Error(`Unexpected fetch: ${target}`);
    };
    const result = await handler(event());
    assert.equal(result.statusCode, 202);
    assert.equal(JSON.parse(result.body).redirectUrl, ['https:', '', ['app', 'sandbox-next', 'peachpayments', 'com'].join('.'), 'api', 'payments', 'redirect', 'pay_test_123'].join('/'));
  });
});
