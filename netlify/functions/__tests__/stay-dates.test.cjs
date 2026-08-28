const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const filePath = path.resolve(__dirname, '../lib/stayDates.cjs');
const source = fs.readFileSync(filePath, 'utf8');
const sandboxModule = { exports: {} };
const nativeRequire = createRequire(filePath);

vm.runInNewContext(source, {
  module: sandboxModule,
  exports: sandboxModule.exports,
  require: nativeRequire,
  console,
  process,
  Buffer,
}, { filename: filePath });

const {
  calculateCheckOutDate,
  normalizeNights,
  parseIsoDate,
} = sandboxModule.exports;

test('stay dates: three nights from 2026-08-20 checkout on 2026-08-23', () => {
  assert.equal(calculateCheckOutDate('2026-08-20', 3), '2026-08-23');
});

test('stay dates: day-two refresh date is the first night after arrival', () => {
  const checkIn = '2026-08-20';
  const checkout = calculateCheckOutDate(checkIn, 3);
  assert.equal(checkout, '2026-08-23');
  assert.equal(calculateCheckOutDate(checkIn, 1), '2026-08-21');
});

test('stay dates: nights must be a positive integer', () => {
  assert.equal(normalizeNights(3), 3);
  assert.equal(normalizeNights('3'), 3);
  assert.equal(normalizeNights(0), null);
  assert.equal(normalizeNights(-1), null);
  assert.equal(normalizeNights(1.5), null);
  assert.equal(normalizeNights('three'), null);
});

test('stay dates: invalid ISO dates are rejected', () => {
  assert.equal(parseIsoDate('2026-02-30'), null);
  assert.equal(calculateCheckOutDate('2026-02-30', 3), null);
});
