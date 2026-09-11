const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'create-indemnity-record.ts'),
  'utf8'
);

test('public indemnity write validates booking and business together before insertion', () => {
  assert.match(source, /bookings\?id=eq\.\$\{encodeURIComponent\(booking_id\)\}&business_id=eq\.\$\{encodeURIComponent\(business_id\)\}/);
  assert.match(source, /if \(!booking \|\| booking\.business_id !== business_id/);
});

test('indemnity record identity is sourced from the authoritative booking', () => {
  assert.match(source, /guest_name: booking\.guest_name \|\| guest_name \|\| null/);
  assert.match(source, /guest_first_name: booking\.guest_first_name \|\| guest_first_name \|\| null/);
  assert.match(source, /guest_last_name: booking\.guest_last_name \|\| guest_last_name \|\| null/);
});

test('indemnity timestamp is server-authoritative', () => {
  assert.match(source, /signed_at: new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(source, /signed_at: signed_at/);
});

test('indemnity errors never return upstream response details', () => {
  assert.doesNotMatch(source, /details:\s*errorText/);
  assert.doesNotMatch(source, /details:\s*error instanceof Error/);
  assert.match(
    source,
    /error:\s*error instanceof SyntaxError \? 'Invalid JSON in request body' : 'Internal server error'/
  );
});
