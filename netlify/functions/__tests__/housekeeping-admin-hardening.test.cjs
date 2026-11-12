const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('administrator Skip is separately authorized and staff Ignore remains available', () => {
  const source = read('netlify/functions/ignore-housekeeping-task.js');
  const staffUi = read('src/components/housekeeping/EmployeeHousekeepingTasks.tsx');
  const adminUi = read('src/components/housekeeping/AdminHousekeepingTaskActions.tsx');
  assert.match(source, /adminOverride === true/);
  assert.match(source, /requireBusinessPermission\(principal, 'canManageSettings'\)/);
  assert.match(source, /canCompleteHousekeepingTask/);
  assert.match(source, /Only pending or active housekeeping tasks can be skipped/);
  assert.match(source, /ROOM_NOT_VACANT/);
  assert.match(source, /AUDIT_WRITE_FAILED/);
  assert.match(adminUi, /adminOverride: true/);
  assert.match(staffUi, /ignoreHousekeepingTask/);
  assert.doesNotMatch(staffUi, /adminOverride:\s*true/);
});

test('checkout housekeeping does not force room occupancy to vacant', () => {
  const source = read('netlify/functions/ignore-housekeeping-task.js');
  assert.match(source, /alreadyCleaned\s*\?\s*\{\s*housekeeping_status: 'ready'\s*\}/);
  assert.doesNotMatch(source, /occupancy_status:\s*'vacant'/);
  assert.match(source, /occupancy_status=eq\.vacant/);
});

test('bulk room readiness is owner/administrator-only and audits before room mutation', () => {
  const source = read('netlify/functions/admin-bulk-room-readiness.js');
  assert.match(source, /requireBusinessPermission\(actor\.principal, 'canManageSettings'\)/);
  assert.ok(source.indexOf('const auditResponse = await fetch') < source.indexOf('const patchResponse = await fetch(patchUrl'));
  assert.match(source, /outcome: 'completed'/);
  assert.match(source, /occupancy_status=eq\.vacant/);
});

test('housekeeping history and dashboard queries paginate beyond PostgREST row limits', () => {
  const source = read('netlify/functions/get-housekeeping-tasks.js');
  assert.match(source, /async function fetchAllRows/);
  assert.match(source, /Range-Unit': 'items'/);
  assert.match(source, /const allTasks = allRes\.rows/);
  assert.match(source, /const skippedRefreshTasks = skippedRefreshRes\.rows/);
  assert.match(source, /const completedToday = completedTodayRes\.rows/);
});

test('administrator completion overrides are explicitly authorized and audited', () => {
  const taskSource = read('netlify/functions/update-housekeeping-task.js');
  const sessionSource = read('netlify/functions/complete-housekeeping-service.js');
  assert.match(taskSource, /adminOverride === true/);
  assert.match(taskSource, /housekeeping_admin_task_completion_requested/);
  assert.match(taskSource, /AUDIT_WRITE_FAILED/);
  assert.match(sessionSource, /adminOverride && !\\([\\s\\S]*canManageSettings/);
  assert.match(sessionSource, /housekeeping_admin_service_completion_requested/);
  assert.match(sessionSource, /ROOM_SYNC_FAILED/);
  assert.match(sessionSource, /AUDIT_WRITE_FAILED/);
});
