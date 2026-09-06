const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = fs.readFileSync(
  path.join(__dirname, '..', 'payfast-webhook.js'),
  'utf8'
);

test('PayFast payment creation requires canonical business authentication and tenant binding', () => {
  assert.match(file, /requireBusinessActor\(event\)/);
  assert.match(file, /resolveTenant\(gate\.principal, businessId\)/);
  assert.match(file, /gate\.principal\.actorType !== 'business'/);
  assert.match(file, /eq\('id', authoritativeBusinessId\)/);
});

test('PayFast payment amount is server-authoritative', () => {
  assert.match(file, /getPlanPricing\(planId, billingCycle\)/);
  assert.match(file, /const authoritativeAmount = pricing\.amount/);
  assert.match(file, /amount: authoritativeAmount/);
  assert.doesNotMatch(file, /const \{ businessId, planId, billingCycle, email, amount,/);
});

test('PayFast ITN verifies signature, merchant, transaction metadata, and amount before activation', () => {
  assert.match(file, /buildPayFastSignature\(pfData\)/);
  assert.match(file, /signaturesMatch\(expectedSignature, suppliedSignature\)/);
  assert.match(file, /pfData\.merchant_id !== PAYFAST_MERCHANT_ID/);
  assert.match(file, /\.eq\('gateway', 'payfast'\)/);
  assert.match(file, /Math\.abs\(receivedAmount - expectedAmount\)/);
  assert.match(file, /pfData\.custom_int1 !== String\(transaction\.business_id\)/);
  assert.match(file, /pfData\.custom_str1 !== String\(transaction\.plan_id\)/);
  assert.match(file, /pfData\.custom_str2 !== String\(transaction\.billing_cycle\)/);
  assert.match(file, /payment_status === 'COMPLETE'/);
});

test('PayFast client-facing errors do not expose upstream payment details', () => {
  assert.doesNotMatch(file, /body:\s*JSON\.stringify\(\{\s*error:\s*error\.message/);
  assert.match(file, /Unable to create payment/);
});
