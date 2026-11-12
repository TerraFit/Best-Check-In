const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');

test('ignore housekeeping task endpoint preserves employee Ignore and protects admin room-state overrides', () => {
  const source = fs.readFileSync(path.join(root, 'netlify', 'functions', 'ignore-housekeeping-task.js'), 'utf8');
  assert.match(source, /requireBusinessActor/);
  assert.match(source, /resolveTenant/);
  assert.match(source, /canCompleteHousekeepingTask/);
  assert.match(source, /adminOverride === true/);
  assert.match(source, /canManageSettings/);
  assert.match(source, /Only pending or active housekeeping tasks can be skipped/);
  assert.match(source, /status: 'skipped'/);
  assert.match(source, /housekeeping_task_ignored/);
  assert.match(source, /Room was cleaned but not recorded/);
  assert.match(source, /Other:/);
  assert.match(source, /ROOM_NOT_VACANT/);
});

test('housekeeping task UI keeps staff Ignore separate from administrator Skip', () => {
  const employee = fs.readFileSync(path.join(root, 'src', 'components', 'housekeeping', 'EmployeeHousekeepingTasks.tsx'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'src', 'components', 'housekeeping', 'AdminHousekeepingTaskActions.tsx'), 'utf8');
  assert.match(employee, /ignoreHousekeepingTask/);
  assert.match(employee, /task\.can_ignore/);
  assert.match(employee, />Ignore<|Ignore Task/);
  assert.match(employee, /Room was cleaned but not recorded/);
  assert.match(employee, /The ignored task remains auditable/);
  assert.doesNotMatch(employee, /adminOverride:\s*true/);
  assert.match(admin, /adminOverride: true/);
});
