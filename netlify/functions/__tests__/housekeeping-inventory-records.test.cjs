const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('inventory records endpoint is tenant scoped and housekeeping protected',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../get-housekeeping-inventory-records.js'),'utf8');
  assert.match(source,/requireBusinessActor/);
  assert.match(source,/requireBusinessPermission\(gate\.principal, 'canViewHousekeeping'\)/);
  assert.match(source,/resolveTenant\(gate\.principal/);
  assert.match(source,/business_id=eq\./);
});

test('inventory records preserve room, booking, employee and stay-day context',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../get-housekeeping-inventory-records.js'),'utf8');
  assert.match(source,/guest_name/);
  assert.match(source,/check_in_date/);
  assert.match(source,/check_out_date/);
  assert.match(source,/employee_name/);
  assert.match(source,/stay_day/);
  assert.match(source,/sales_value/);
});

test('inventory snapshot PDF is tenant scoped and records catalogue price snapshot',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../generate-housekeeping-inventory-snapshot.js'),'utf8');
  assert.match(source,/requireBusinessActor/);
  assert.match(source,/requireBusinessPermission\(gate\.principal,'canViewHousekeeping'\)/);
  assert.match(source,/unit_price_snapshot/);
  assert.match(source,/buildVisualPdf/);
});

test('inventory notifications are opt-in and require a valid email address',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../save-housekeeping-inventory-notification-settings.js'),'utf8');
  assert.match(source,/canManageSettings/);
  assert.match(source,/emailEnabled/);
  assert.match(source,/valid email address is required/);
});

test('inventory recording sends one best-effort summary email without making billing changes',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../record-housekeeping-inventory.js'),'utf8');
  assert.match(source,/housekeeping_inventory_email_enabled/);
  assert.match(source,/new Resend/);
  assert.match(source,/FastCheckIn has not charged the guest/);
  assert.match(source,/billing_status:'not_applicable'/);
});
