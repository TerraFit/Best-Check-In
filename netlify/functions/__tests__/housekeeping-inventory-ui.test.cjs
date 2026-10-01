const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

test('housekeeping inventory feature is wired for catalogue management and future billing', () => {
  const settings = read('src/components/housekeeping/HousekeepingInventorySettings.tsx');
  const modal = read('src/components/housekeeping/HousekeepingServiceModal.tsx');
  const api = read('src/services/housekeepingInventoryApi.ts');
  const schema = read('docs/migrations/020_housekeeping_inventory_catalogue.sql');
  const record = read('netlify/functions/record-housekeeping-inventory.js');

  assert.match(settings, /saveHousekeepingInventory/);
  assert.match(settings, /Load starter list/);
  assert.match(settings, /Price \(optional\)/);
  assert.match(modal, /fetchHousekeepingInventory/);
  assert.match(modal, /recordHousekeepingInventory/);
  assert.match(modal, /Taken \/ used/);
  assert.match(modal, /Restocked/);
  assert.match(api, /record-housekeeping-inventory/);
  assert.match(schema, /nightbridge_item_id/);
  assert.match(schema, /billing_status/);
  assert.match(schema, /unit_price_snapshot/);
  assert.match(record, /billing_status:'not_applicable'/);
  assert.match(record, /booking_id:session\.booking_id/);
});
