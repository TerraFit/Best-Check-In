const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');

test('ignore housekeeping task endpoint is authoritative and audited', () => {
  const source = fs.readFileSync(path.join(root, 'ignore-housekeeping-task.js'), 'utf8');
  assert.match(source, /requireBusinessActor/);
  assert.match(source, /resolveTenant/);
  assert.match(source, /canCompleteHousekeepingTask/);
  assert.match(source, /status !== 'pending'/);
  assert.match(source, /ACTIVE_SERVICE_SESSION/);
  assert.match(source, /status: 'skipped'/);
  assert.match(source, /housekeeping_task_ignored/);
  assert.match(source, /Room was cleaned but not recorded/);
  assert.match(source, /Other: \x{3}/); // endpoint must require details for Other
});

test('housekeeping task UI exposes Start and Ignore for eligible pending tasks', () => {
  const source = fs.readFileSync(path.join(root, '..', '..', 'src', 'components', 'housekeeping', 'EmployeeHousekeepingTasks.tsx'), 'utf8');
  assert.match(source, /ignoreHousekeepingTask/);
  assert.match(source, /task\.can_ignore/);
  assert.match(source, />Ignore<|Ignore Task/);
  assert.match(source, /Room was cleaned but not recorded/);
  assert.match(source, /The ignored task remains auditable/);
});
