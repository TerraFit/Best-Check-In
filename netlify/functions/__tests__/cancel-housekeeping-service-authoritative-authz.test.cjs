const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('housekeeping cancellation endpoint requires an explicit reason', () => {
  const source = fs.readFileSync(path.join(__dirname, '../cancel-housekeeping-service.js'), 'utf8');
  assert.match(source, /CANCELLATION_REASON_REQUIRED/);
  assert.match(source, /typeof body\.reason === 'string'/);
  assert.match(source, /reason\.trim\(\)/);
});

test('housekeeping cancellation is tenant-scoped and employee-scoped', () => {
  const source = fs.readFileSync(path.join(__dirname, '../cancel-housekeeping-service.js'), 'utf8');
  assert.match(source, /resolveTenant\(principal, body\.businessId \|\| null\)/);
  assert.match(source, /business_id=eq\.\$\{q\(businessId\)\}/);
  assert.match(source, /session\.employee_id.*principal\.employeeId/);
  assert.match(source, /status=eq\.active/);
});

test('housekeeping cancellation resets task to pending without creating a pause state', () => {
  const source = fs.readFileSync(path.join(__dirname, '../cancel-housekeeping-service.js'), 'utf8');
  assert.match(source, /status: 'cancelled'/);
  assert.match(source, /status: 'pending'/);
  assert.doesNotMatch(source, /status: ['\"]paused['\"]/);
  assert.match(source, /cancellation_reason: reason/);
});

test('housekeeping cancellation migration enforces a reason for cancelled sessions', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../../docs/migrations/017_housekeeping_service_cancellation.sql'), 'utf8');
  assert.match(source, /ADD COLUMN IF NOT EXISTS cancelled_at/);
  assert.match(source, /ADD COLUMN IF NOT EXISTS cancelled_by/);
  assert.match(source, /ADD COLUMN IF NOT EXISTS cancellation_reason/);
  assert.match(source, /status <> 'cancelled'/);
  assert.match(source, /btrim\(cancellation_reason\) <> ''/);
});
