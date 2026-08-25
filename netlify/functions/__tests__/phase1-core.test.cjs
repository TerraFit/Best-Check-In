const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '../..', '..');

function selectExports(moduleExports, exportNames) {
  return Object.fromEntries(exportNames.map((name) => [name, moduleExports[name]]));
}

function loadCommonJsExports(relativeFile, exportNames, { stubAuth = false } = {}) {
  const filePath = path.join(ROOT, relativeFile);
  const source = fs.readFileSync(filePath, 'utf8');
  const module = { exports: {} };
  const nativeRequire = createRequire(path.resolve(filePath));
  const requireForFile = (request) => {
    if (stubAuth && request === './_housekeepingServiceAuth.cjs') {
      return {
        authenticateHousekeepingServiceLive: async () => ({ ok: true }),
        resolveBusinessId: (_principal, businessId) => ({ ok: true, businessId }),
      };
    }
    return nativeRequire(request);
  };

  const sandbox = {
    module,
    exports: module.exports,
    require: requireForFile,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  vm.runInNewContext(source, sandbox, { filename: filePath });
  return selectExports(module.exports, exportNames);
}

function loadTypeScriptExports(relativeFile, exportNames) {
  const filePath = path.join(ROOT, relativeFile);
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;
  const module = { exports: {} };
  const nativeRequire = createRequire(path.resolve(filePath));
  const sandbox = {
    module,
    exports: module.exports,
    require: nativeRequire,
    console,
    process,
  };
  vm.runInNewContext(compiled, sandbox, { filename: filePath });
  return selectExports(module.exports, exportNames);
}

const stayDates = loadCommonJsExports('netlify/functions/lib/stayDates.js', [
  'calculateCheckOutDate',
  'normalizeNights',
  'parseIsoDate',
]);

const housekeepingGenerator = loadCommonJsExports(
  'netlify/functions/generate-housekeeping-tasks.js',
  ['generateSchedule', 'serviceForToday'],
  { stubAuth: true }
);

const housekeepingDefinitions = loadTypeScriptExports(
  'src/services/housekeepingServiceDefinitions.ts',
  ['getHousekeepingChecklist', 'getChecklistItemIds', 'createInitialChecklistState']
);

const issueTypes = loadTypeScriptExports('src/types/housekeepingIssues.ts', [
  'HOUSEKEEPING_ISSUE_CATALOG',
  'getIssueOption',
]);

function readSource(relativeFile) {
  return fs.readFileSync(path.join(ROOT, relativeFile), 'utf8');
}

test('Phase 1 stay dates: checkout is derived from check-in + nights', () => {
  assert.equal(stayDates.calculateCheckOutDate('2026-08-20', 3), '2026-08-23');
  assert.equal(stayDates.calculateCheckOutDate('2026-08-20', '3'), '2026-08-23');
  assert.equal(stayDates.calculateCheckOutDate('2026-08-20', 1), '2026-08-21');
});

test('Phase 1 stay dates: invalid or non-positive nights are rejected', () => {
  assert.equal(stayDates.normalizeNights(0), null);
  assert.equal(stayDates.normalizeNights(-1), null);
  assert.equal(stayDates.normalizeNights(1.5), null);
  assert.equal(stayDates.normalizeNights('three'), null);
  assert.equal(stayDates.calculateCheckOutDate('2026-02-30', 3), null);
});

test('Phase 1 schedule: three-night stay has refresh on stayover nights and full service on checkout', () => {
  const schedule = housekeepingGenerator.generateSchedule('2026-08-20', '2026-08-23', 'standard', {});
  assert.deepEqual(schedule, [
    { scheduled_date: '2026-08-21', task_type: 'refresh', is_checkout: false, stay_night: 1 },
    { scheduled_date: '2026-08-22', task_type: 'refresh', is_checkout: false, stay_night: 2 },
    { scheduled_date: '2026-08-23', task_type: 'full_service', is_checkout: true, stay_night: 3 },
  ]);
});

test('Phase 1 schedule: arrival day has no housekeeping task', () => {
  assert.equal(
    housekeepingGenerator.serviceForToday('2026-08-20', '2026-08-23', '2026-08-20', 'standard', {}),
    null
  );
});

test('Phase 1 schedule: day two of a three-night stay is a refresh even if digital check-in happens later', () => {
  const service = housekeepingGenerator.serviceForToday(
    '2026-08-20',
    '2026-08-23',
    '2026-08-21',
    'standard',
    {}
  );
  assert.deepEqual(service, {
    scheduled_date: '2026-08-21',
    task_type: 'refresh',
    is_checkout: false,
    stay_night: 1,
    kind: 'stayover',
  });
});

test('Phase 1 schedule: checkout date always produces full service', () => {
  for (const policy of ['eco', 'standard', 'custom', 'premium']) {
    const service = housekeepingGenerator.serviceForToday(
      '2026-08-20',
      '2026-08-23',
      '2026-08-23',
      policy,
      { custom_full_interval: 2 }
    );
    assert.equal(service.task_type, 'full_service');
    assert.equal(service.is_checkout, true);
    assert.equal(service.kind, 'checkout');
  }
});

test('Phase 1 schedule: dates outside the stay produce no task', () => {
  assert.equal(
    housekeepingGenerator.serviceForToday('2026-08-20', '2026-08-23', '2026-08-19', 'standard', {}),
    null
  );
  assert.equal(
    housekeepingGenerator.serviceForToday('2026-08-20', '2026-08-23', '2026-08-24', 'standard', {}),
    null
  );
});

test('Phase 1 schedule: five-night standard stay inserts a full service before checkout', () => {
  const schedule = housekeepingGenerator.generateSchedule('2026-08-20', '2026-08-25', 'standard', {});
  assert.deepEqual(schedule.map(({ scheduled_date, task_type, stay_night }) => ({ scheduled_date, task_type, stay_night })), [
    { scheduled_date: '2026-08-21', task_type: 'refresh', stay_night: 1 },
    { scheduled_date: '2026-08-22', task_type: 'refresh', stay_night: 2 },
    { scheduled_date: '2026-08-23', task_type: 'full_service', stay_night: 3 },
    { scheduled_date: '2026-08-24', task_type: 'refresh', stay_night: 4 },
    { scheduled_date: '2026-08-25', task_type: 'full_service', stay_night: 5 },
  ]);
});

test('Phase 1 schedule: premium policy services every intermediate stay night', () => {
  const schedule = housekeepingGenerator.generateSchedule('2026-08-20', '2026-08-24', 'premium', {});
  assert.deepEqual(schedule.map((task) => task.task_type), [
    'full_service',
    'full_service',
    'full_service',
    'full_service',
  ]);
  assert.equal(schedule.at(-1).is_checkout, true);
});

test('Phase 1 checklist: Guest Property / Lost & Found is first and contains the required eight checks', () => {
  const checklist = housekeepingDefinitions.getHousekeepingChecklist('full_service');
  assert.equal(checklist[0].id, 'full-guest-property');
  assert.equal(checklist[0].title, 'Guest Property / Lost & Found — FIRST');
  assert.equal(checklist[0].items.length, 8);
  assert.deepEqual(checklist[0].items.map((item) => item.id), [
    'full-lost-bedroom-tabletops',
    'full-lost-under-bed',
    'full-lost-closet',
    'full-lost-drawers',
    'full-lost-safe',
    'full-lost-bathroom',
    'full-lost-fridge',
    'full-lost-report',
  ]);
  assert.equal(checklist[1].id, 'full-ventilation');
});

test('Phase 1 checklist: final visual inspection precedes securing the room', () => {
  const checklist = housekeepingDefinitions.getHousekeepingChecklist('full_service');
  const finalSection = checklist.find((section) => section.id === 'full-final');
  assert.ok(finalSection);
  const ids = finalSection.items.map((item) => item.id);
  assert.ok(ids.indexOf('full-final-look') >= 0);
  assert.ok(ids.indexOf('full-door') > ids.indexOf('full-final-look'));
});

test('Phase 1 checklist: temperature is a single choice, not three independent required checks', () => {
  const source = readSource('src/components/housekeeping/HousekeepingServiceModal.tsx');
  assert.match(source, /const TEMPERATURE_IDS = \['full-temperature', 'full-too-cold', 'full-too-hot'\]/);
  assert.match(source, /TEMPERATURE_IDS\.forEach\(\(id\) => \{ next\[id\] = false; \}\)/);
  assert.match(source, /next\[selectedId\] = true/);
  assert.match(source, /\[\['full-temperature','Comfortable','comfortable'\],\['full-too-cold','Too cold','too_cold'\],\['full-too-hot','Too hot','too_hot'\]\]/);
});

test('Phase 1 checklist: Lost & Found from the employee task stays in the checklist and uses the full create form', () => {
  const source = readSource('src/components/housekeeping/EmployeeHousekeepingTasks.tsx');
  assert.match(source, /import LostFoundCreateForm from '\.\.\/lostFound\/LostFoundCreateForm'/);
  assert.match(source, /const \[showLostFound, setShowLostFound\]/);
  assert.match(source, /setShowLostFound\(true\)/);
  assert.match(source, /Lost & Found item .* was logged successfully\./);
  assert.match(source, /showLostFound && <LostFoundCreateForm/);
});

test('Phase 1 issue catalog: every contextual category has Other and representative issue types', () => {
  const catalog = issueTypes.HOUSEKEEPING_ISSUE_CATALOG;
  for (const [key, option] of Object.entries(catalog)) {
    assert.ok(option.types.includes('Other'), `${key} must include Other`);
  }
  assert.deepEqual(issueTypes.getIssueOption('full-lighting', 'Check all lighting').category, 'Lighting');
  assert.ok(catalog.lighting.types.includes('Broken bulb'));
  assert.ok(catalog.lighting.types.includes('Missing bulb'));
  assert.ok(catalog.lighting.types.includes('Damaged cable/wire'));
  assert.ok(catalog.furniture.types.includes('Stained'));
  assert.ok(catalog.furniture.types.includes('Scratched'));
  assert.ok(catalog.furniture.types.includes('Broken'));
  assert.ok(catalog.furniture.types.includes('Missing'));
  assert.deepEqual(issueTypes.getIssueOption('full-fridge', 'Clean and restock minibar/fridge').category, 'Minibar / Fridge');
});

test('Phase 1 issue modal: Other requires a description and issues can be routed to Maintenance', () => {
  const source = readSource('src/components/housekeeping/HousekeepingIssueModal.tsx');
  assert.match(source, /if \(issueType === 'Other' && !otherDescription\.trim\(\)\)/);
  assert.match(source, /maintenanceRequested/);
  assert.match(source, /Send to Maintenance/);
  assert.match(source, /Route this issue to the Maintenance follow-up queue\./);
});

test('Phase 1 completion flow: employee can review persisted issues before completing service', () => {
  const source = readSource('src/components/housekeeping/HousekeepingServiceModal.tsx');
  assert.match(source, /fetchHousekeepingIssues\(\{ businessId, sessionId: session\.id \}\)/);
  assert.match(source, /Review before completion/);
  assert.match(source, /completeHousekeepingService/);
  assert.match(source, /issuesReportedCount: issueCount/);
});

test('Phase 1 inspection flow: management can approve or reject a completed task', () => {
  const source = readSource('src/pages/tabs/HousekeepingTab.tsx');
  assert.match(source, /action: 'skip' \| 'approve' \| 'reject'/);
  assert.match(source, /inspection_status: 'approved'/);
  assert.match(source, /inspection_status: 'rejected', status: 'in_progress'/);
});

test('Phase 1 assignment contract: UI assignment is optional and supports returning tasks to any housekeeper', () => {
  const source = readSource('src/pages/tabs/HousekeepingTab.tsx');
  assert.match(source, /const \[taskAssignmentsEnabled, setTaskAssignmentsEnabled\] = useState\(false\)/);
  assert.match(source, /Any housekeeper — unassign/);
  assert.match(source, /assigned_staff_id: assignedStaffId/);
  assert.match(source, /assigned_staff_name: assignedStaffName/);
});
