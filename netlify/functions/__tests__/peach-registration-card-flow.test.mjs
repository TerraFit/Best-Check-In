import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const { handler } = await import('../peach-confirm-registration-card.js');

const envKeys = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'PEACH_ORCHESTRATION_API_KEY', 'PEACH_ORCHESTRATION_BASE_URL'];
const withEnv = async (run) => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_KEY = 'service-test-key';
  process.env.PEACH_ORCHESTRATION_API_KEY = 'peach-test-key';
  const peachHost = ['app', 'sandbox-next', 'peachpayments', 'com'].join('.');
  process.env.PEACH_ORCHESTRATION_BASE_URL = ['https:', '', peachHost].join('/');
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
    assert.equal(patched, true);
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
