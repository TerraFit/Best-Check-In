const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'business-login.js'),
  'utf8'
);

test('business login: only approved businesses can establish an application session', () => {
  assert.match(source, /business\.status !== 'approved'/);
  assert.match(source, /if \(!business \|\| business\.status !== 'approved' \|\| !business\.password_hash\)/);
  assert.match(source, /error: 'Invalid email or password'/);
});

test('business login: database lookup failures do not become successful authentication', () => {
  assert.match(source, /if \(!response\.ok\)/);
  assert.match(source, /return \{ statusCode: 500, headers, body: JSON\.stringify\(\{ error: 'Login failed' \}\) \};/);
});

test('business login: privileged database selection is limited to authentication fields', () => {
  assert.match(source, /select=id,trading_name,email,password_hash,status,setup_complete/);
  assert.doesNotMatch(source, /select=\*/);
});
