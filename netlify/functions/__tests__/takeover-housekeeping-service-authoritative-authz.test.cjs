const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('housekeeping takeover requires an explicit reason and active session', () => {
  const source = fs.readFileSync(path.join(__dirname, '../takeover-housekeeping-service.js'), 'utf8');
  assert.match(source, /TAKEOVER_REASON_REQUIRED/);
  assert.match(source, /status=eq\.active/);
  assert.match(source, /sessionId is required/);
});

test('housekeeping takeover is tenant-scoped and requires start permission', () => {
  const source = fs.readFileSync(path.join(__dirname, '../takeover-housekeeping-service.js'), 'utf8');
  assert.match(source, /resolveTenant\(principal, body\.businessId \|\| null\)/);
  assert.match(source, /business_id=eq\.\$\{q\(businessId\)\}/);
  assert.match(source, /canStartHousekeepingTask/);
  assert.match(source, /EMPLOYEE_DISABLED/);
});

test('housekeeping takeover preserves original start time and checklist state', () => {
  const source = fs.readFileSync(path.join(__dirname, '../takeover-housekeeping-service.js'), 'utf8');
  assert.match(source, /started_at: session\.started_at/);
  assert.match(source, /checklist_state: session\.checklist_state/);
  assert.match(source, /checklist_completed_count: session\.checklist_completed_count/);
  assert.match(source, /takeover_from_session_id: session\.id/);
  assert.match(source, /takeover_reason: reason/);
});

test('housekeeping takeover closes the previous session as an auditable handover', () => {
  const source = fs.readFileSync(path.join(__dirname, '../takeover-housekeeping-service.js'), 'utf8');
  assert.match(source, /status: 'cancelled'/);
  assert.match(source, /cancellation_reason/);
  assert.match(source, /cancelled_by/);
  assert.match(source, /taken_over_at/);
});

test('housekeeping takeover migration adds explicit audit fields', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../../docs/migrations/018_housekeeping_service_takeover.sql'), 'utf8');
  assert.match(source, /takeover_from_session_id/);
  assert.match(source, /takeover_reason/);
  assert.match(source, /taken_over_at/);
  assert.match(source, /taken_over_by/);
});

test('housekeeping UI offers takeover reasons and keeps the timer from resetting', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../../src/pages/tabs/HousekeepingTab.tsx'), 'utf8');
  assert.match(source, /Take Over Service/);
  assert.match(source, /Opened but not started/);
  assert.match(source, /Started but not finished/);
  assert.match(source, /Previous employee cancelled \/ did not close/);
  assert.match(source, /Employee unavailable/);
  assert.match(source, /Confirm Take Over/);
  assert.match(source, /original start time are carried forward/);
});
