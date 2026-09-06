const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const functionsDir = path.join(__dirname, '..');

function read(name) {
  return fs.readFileSync(path.join(functionsDir, name), 'utf8');
}

test('Peach payment creation requires canonical business authentication and tenant binding', () => {
  const source = read('peach-payments.js');
  assert.match(source, /auth\.requireBusinessActor\(event\)/);
  assert.match(source, /gate\.principal\.actorType !== 'business'/);
  assert.match(source, /auth\.resolveTenant\(gate\.principal, businessId\)/);
  assert.match(source, /\.eq\('id', scope\.businessId\)/);
  assert.doesNotMatch(source, /const \{ businessId, planId, billingCycle, email, amount/);
});

test('Peach payment amount is server-authoritative', () => {
  const source = read('peach-payments.js');
  assert.match(source, /getPlanPricing\(planId, billingCycle\)/);
  assert.match(source, /amount: authoritativeAmount/);
  assert.match(source, /amount: authoritativeAmount\.toString\(\)/);
  assert.doesNotMatch(source, /amount:\s*amount[\s,}]/);
});

test('Ozow payment creation requires canonical business authentication and tenant binding', () => {
  const source = read('ozow-payment.js');
  assert.match(source, /auth\.requireBusinessActor\(event\)/);
  assert.match(source, /gate\.principal\.actorType !== 'business'/);
  assert.match(source, /auth\.resolveTenant\(gate\.principal, businessId\)/);
  assert.match(source, /\.eq\('id', scope\.businessId\)/);
  assert.doesNotMatch(source, /const \{ businessId, planId, billingCycle, email, amount/);
});

test('Ozow payment amount is server-authoritative', () => {
  const source = read('ozow-payment.js');
  assert.match(source, /getPlanPricing\(planId, billingCycle\)/);
  assert.match(source, /amount: authoritativeAmount/);
  assert.match(source, /Amount: authoritativeAmount/);
  assert.doesNotMatch(source, /Amount:\s*amount[\s,}]/);
});

test('Stripe webhook keeps signature verification errors generic to the client', () => {
  const source = read('stripe-webhook.js');
  assert.match(source, /stripe\.webhooks\.constructEvent\(event\.body, sig, webhookSecret\)/);
  assert.match(source, /error: 'Invalid webhook signature'/);
  assert.doesNotMatch(source, /error: err\.message/);
});

test('Peach and Ozow payment creation do not expose upstream provider errors', () => {
  for (const name of ['peach-payments.js', 'ozow-payment.js']) {
    const source = read(name);
    assert.match(source, /body: JSON\.stringify\(\{ error: 'Payment could not be created' \}\)/);
    assert.doesNotMatch(source, /body: JSON\.stringify\(\{ error: error\.message \}\)/);
  }
});
