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
  assert.ok(source.includes('adminOverride === true'));
  assert.ok(source.includes('resolvePermissions({'));
  assert.ok(source.includes("has('canManageSettings')"));
  assert.ok(source.includes('canCompleteHousekeepingTask'));
  assert.ok(source.includes('ROOM_NOT_VACANT'));
  assert.ok(source.includes('AUDIT_WRITE_FAILED'));
  assert.ok(adminUi.includes('adminOverride: true'));
  assert.ok(staffUi.includes('ignoreHousekeepingTask'));
  assert.ok(!staffUi.includes('adminOverride: true'));
});

test('employee Ignore cannot mark a room ready or approve it as already cleaned', () => {
  const source = read('netlify/functions/ignore-housekeeping-task.js');
  assert.ok(source.includes("if (adminOverride !== true && ['Already cleaned', 'Maintenance'].includes(normalizedReason))"));
  assert.ok(source.includes("const alreadyCleaned = normalizedReason === 'Already cleaned';"));
  assert.ok(source.includes("const nextStatus = alreadyCleaned ? 'completed' : 'skipped';"));
  assert.ok(source.includes("const roomPatch = alreadyCleaned"));
});

test('checkout housekeeping does not force room occupancy to vacant', () => {
  const source = read('netlify/functions/ignore-housekeeping-task.js');
  assert.ok(source.includes("? { housekeeping_status: 'ready' }"));
  assert.ok(!source.includes("occupancy_status: 'vacant'"));
  assert.ok(source.includes('occupancy_status=eq.vacant'));
});

test('bulk room readiness is owner/administrator-only and audits before room mutation', () => {
  const source = read('netlify/functions/admin-bulk-room-readiness.js');
  assert.ok(source.includes('function hasAdministratorPermission(principal)'));
  assert.ok(source.includes("}).has('canManageSettings')"));
  assert.ok(source.indexOf('const auditResponse = await fetch') < source.indexOf('const patchResponse = await fetch(patchUrl'));
  assert.ok(source.includes("outcome: 'completed'"));
  assert.ok(source.includes('occupancy_status=eq.vacant'));
});

test('housekeeping history and dashboard queries paginate beyond PostgREST row limits', () => {
  const source = read('netlify/functions/get-housekeeping-tasks.js');
  assert.ok(source.includes('async function fetchAllRows'));
  assert.ok(source.includes("'Range-Unit': 'items'"));
  assert.ok(source.includes('const allTasks = allRes.rows'));
  assert.ok(source.includes('const skippedRefreshTasks = skippedRefreshRes.rows'));
  assert.ok(source.includes('const completedToday = completedTodayRes.rows'));
});

test('administrator completion overrides are explicitly authorized and audited', () => {
  const taskSource = read('netlify/functions/update-housekeeping-task.js');
  const sessionSource = read('netlify/functions/complete-housekeeping-service.js');
  assert.ok(taskSource.includes('adminOverride === true'));
  assert.ok(taskSource.includes('housekeeping_admin_task_completion_requested'));
  assert.ok(taskSource.includes('AUDIT_WRITE_FAILED'));
  assert.ok(sessionSource.includes('adminOverride && !('));
  assert.ok(sessionSource.includes("has('canManageSettings')"));
  assert.ok(sessionSource.includes('housekeeping_admin_service_completion_requested'));
  assert.ok(sessionSource.includes('ROOM_SYNC_FAILED'));
  assert.ok(sessionSource.includes('AUDIT_WRITE_FAILED'));
});
