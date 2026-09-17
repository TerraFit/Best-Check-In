const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('service UI reduces to timer without pausing elapsed time', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../../src/components/housekeeping/HousekeepingServiceModal.tsx'), 'utf8');
  assert.match(source, /setReduced\(true\)/);
  assert.match(source, /Resume Checklist/);
  assert.match(source, /Timer is calculated from the server-recorded start time and continues while the checklist is reduced/);
  assert.doesNotMatch(source, /setPaused\(/);
  assert.doesNotMatch(source, /status: ['\"]paused['\"]/);
});

test('service UI provides required cancellation reason and explicit confirmation', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../../src/components/housekeeping/HousekeepingServiceModal.tsx'), 'utf8');
  assert.match(source, /Cancel Service/);
  assert.match(source, /Reason <span className="text-red-600">\*<\/span>/);
  assert.match(source, /Confirm Cancellation/);
  assert.match(source, /cancelHousekeepingService\(\{ businessId, sessionId: session\.id, reason: cancelValue \}\)/);
  assert.match(source, /Wrong room \/ wrong task/);
  assert.match(source, /Guest returned/);
  assert.match(source, /Maintenance required/);
  assert.match(source, /Unable to complete/);
  assert.match(source, /Other/);
});

test('reduced service can auto-expand after returning to a visible tab', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../../src/components/housekeeping/HousekeepingServiceModal.tsx'), 'utf8');
  assert.match(source, /document\.visibilityState !== 'visible'/);
  assert.match(source, /setTimeout\(\(\) => setReduced\(false\), 10000\)/);
});
