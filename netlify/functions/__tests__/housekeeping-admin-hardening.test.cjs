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

test('employee confirms cleaned room and closes older pending tasks for that room without deleting history', () => {
  const source = read('netlify/functions/ignore-housekeeping-task.js');
  assert.ok(source.includes("normalizedReason === 'Room was cleaned but not recorded'"));
  assert.ok(source.includes('&status=eq.pending&scheduled_date=lte.'));
  assert.ok(source.includes('&id=neq.'));
  assert.ok(source.includes("status: 'skipped'"));
  assert.ok(source.includes('cleared_previous_pending_tasks'));
  assert.ok(source.includes('housekeeping_previous_pending_tasks_cleared'));
  assert.ok(source.includes('Previous pending tasks were changed, but the audit event could not be saved'));
  assert.ok(source.includes('PREVIOUS_TASKS_CHANGED'));
  assert.ok(source.indexOf('const activeRes = await fetch') < source.indexOf('let clearedPreviousTasks'));
  assert.ok(source.indexOf('for (const session of activeSessions)') < source.indexOf('let clearedPreviousTasks'));
  assert.ok(source.includes('cleared_previous_pending_tasks: clearedPreviousTasks.length'));
  // Employee confirmation must not acquire the administrator-only room-ready patch.
  assert.ok(source.includes("const alreadyCleaned = normalizedReason === 'Already cleaned';"));
  assert.ok(source.includes("if (!isAdminOverride && ['Already cleaned', 'Maintenance'].includes(normalizedReason))"));
});

test('employee Ignore cannot mark a room ready or approve it as already cleaned', () => {
  const source = read('netlify/functions/ignore-housekeeping-task.js');
  assert.ok(source.includes("if (!isAdminOverride && ['Already cleaned', 'Maintenance'].includes(normalizedReason))"));
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

test('Today includes pending due services while keeping one operational card per room', () => {
  const source = read('netlify/functions/get-housekeeping-tasks.js');
  assert.match(source, /\['pending', 'in_progress'\]\.includes\(task\.status\) && task\.scheduled_date <= todayStr/);
  assert.match(source, /const dueOpenTasks = allTasks\.filter/);
  assert.match(source, /const completedTodayTasks = allTasks\.filter/);
  assert.match(source, /const roomsWithDueOpenWork = new Set\(latestDueOpenByRoom\.map\(roomKey\)\)/);
  assert.match(source, /tasks = \[\.\.\.latestDueOpenByRoom, \.\.\.latestPerRoom\(completedForOtherRooms\)\]/);
  assert.match(source, /const roomsWithDueTasks = new Set\(dueTasks\.map\(roomKey\)\)/);
  assert.match(source, /const latestPerRoom = \(candidateTasks\)/);
  assert.match(source, /if \(view === 'completed'\)[\s\S]*?latestPerRoom\(allTasks\.filter\(\(task\) => task\.status === 'completed'\)\)/);
});


test('adminOverride accepts only booleans and never treats truthy strings as authorization', async () => {
  const { isValidAdminOverride: isUpdateOverrideValid } = await import('../update-housekeeping-task.js');
  const { isValidAdminOverride: isIgnoreOverrideValid } = await import('../ignore-housekeeping-task.js');
  for (const validate of [isUpdateOverrideValid, isIgnoreOverrideValid]) {
    assert.equal(validate(false), true);
    assert.equal(validate(true), true);
    assert.equal(validate('true'), false);
    assert.equal(validate(1), false);
    assert.equal(validate({}), false);
  }
  const updateSource = read('netlify/functions/update-housekeeping-task.js');
  const ignoreSource = read('netlify/functions/ignore-housekeeping-task.js');
  assert.ok(updateSource.includes('const isAdminOverride = adminOverride === true;'));
  assert.ok(ignoreSource.includes('const isAdminOverride = adminOverride === true;'));
  assert.ok(!updateSource.includes('if (adminOverride)'));
  assert.ok(!ignoreSource.includes('if (adminOverride)'));
});

test('staff cannot Ignore an in-progress task or cancel its active service session', async () => {
  const { canIgnoreTaskStatus } = await import('../ignore-housekeeping-task.js');
  assert.equal(canIgnoreTaskStatus('pending', false), true);
  assert.equal(canIgnoreTaskStatus('in_progress', false), false);
  assert.equal(canIgnoreTaskStatus('completed', false), false);
  assert.equal(canIgnoreTaskStatus('in_progress', true), true);
  assert.equal(canIgnoreTaskStatus('pending', true), true);
  const source = read('netlify/functions/ignore-housekeeping-task.js');
  assert.ok(source.includes('ACTIVE_TASK_ADMIN_ONLY'));
  assert.ok(source.includes('ACTIVE_SERVICE_SESSION_ADMIN_ONLY'));
  assert.ok(source.includes('if (activeSessions.length && !isAdminOverride)'));
  assert.ok(source.includes('Only an authorized administrator can cancel active service sessions'));
});

test('partial previous-task cleanup audits the rows actually changed before returning conflict', async () => {
  const { buildPreviousTaskCleanupAudit } = await import('../ignore-housekeeping-task.js');
  const candidates = [
    { id: 'old-1', booking_id: 'booking-1', guest_name: 'Guest One', scheduled_date: '2026-11-10', status: 'pending' },
    { id: 'old-2', booking_id: 'booking-2', guest_name: 'Guest Two', scheduled_date: '2026-11-11', status: 'pending' },
  ];
  const actual = [{ id: 'old-1', status: 'skipped' }];
  const audit = buildPreviousTaskCleanupAudit(candidates, actual);
  assert.equal(audit.expectedCount, 2);
  assert.equal(audit.changedCount, 1);
  assert.equal(audit.partial, true);
  assert.deepEqual(audit.clearedTasks.map((task) => task.id), ['old-1']);
  assert.equal(audit.clearedTasks[0].booking_id, 'booking-1');
  const source = read('netlify/functions/ignore-housekeeping-task.js');
  assert.ok(source.includes('const cleanupAudit = buildPreviousTaskCleanupAudit(clearedPreviousTasks, clearedRows);'));
  assert.ok(source.indexOf('const previousAuditRes = await fetch') < source.indexOf('if (cleanupAudit.partial)'));
  assert.ok(source.includes('housekeeping_previous_pending_tasks_cleanup_unconfirmed'));
  assert.ok(source.includes("outcome: 'unconfirmed'"));
  assert.ok(source.includes('expected_count: cleanupAudit.expectedCount'));
  assert.ok(source.includes('changed_count: cleanupAudit.changedCount'));
});
