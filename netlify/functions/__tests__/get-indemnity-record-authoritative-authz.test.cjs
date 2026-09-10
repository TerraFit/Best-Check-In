const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'get-indemnity-record.ts'),
  'utf8'
);

test('public indemnity retrieval uses a capability token', () => {
  assert.match(
    source,
    /event\.queryStringParameters\?\.token/
  );
  assert.match(
    source,
    /const encodedToken = encodeURIComponent\(token\)/
  );
  assert.match(
    source,
    /access_token=eq\.\$\{encodedToken\}/
  );
});

test('missing capability token is rejected before database access', () => {
  assert.match(
    source,
    /if \(!token\)/
  );
  assert.match(
    source,
    /statusCode:\s*400/
  );
  assert.match(
    source,
    /error:\s*'Token required'/
  );
});

test('indemnity retrieval uses an explicit least-privilege field selection', () => {
  assert.match(
    source,
    /select=guest_name,guest_first_name,guest_last_name,passport_or_id,signature_data,signed_at,indemnity_text,business_id/
  );
  assert.doesNotMatch(
    source,
    /indemnity_records\?[^`]*select=\*/
  );
});

test('business lookup is bound to the business_id from the validated indemnity record', () => {
  assert.match(
    source,
    /businesses\?id=eq\.\$\{record\.business_id\}&select=trading_name,logo_url/
  );
});

test('public response does not expose capability or request metadata', () => {
  assert.doesNotMatch(source, /access_token:\s*record\./);
  assert.doesNotMatch(source, /booking_id:\s*record\./);
  assert.doesNotMatch(source, /ip_address:\s*record\./);
  assert.doesNotMatch(source, /user_agent:\s*record\./);
  assert.doesNotMatch(source, /guest_signature:\s*record\./);
});

test('indemnity not-found paths return a generic response', () => {
  assert.match(
    source,
    /statusCode:\s*404/
  );
  assert.match(
    source,
    /error:\s*'Indemnity record not found'/
  );
});

test('unexpected errors do not expose upstream error details', () => {
  assert.match(
    source,
    /statusCode:\s*500/
  );
  assert.match(
    source,
    /error:\s*'Internal server error'/
  );
  assert.doesNotMatch(
    source,
    /details:\s*error/
  );
});
