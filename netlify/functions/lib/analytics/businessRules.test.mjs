
import {
  isEligibleStay,
  overlappingNights,
  bookingNights,
  stayOverlapsPeriod,
  filterEligibleOverlapping,
} from './businessRules.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// cancelled excluded
assert(!isEligibleStay({ status: 'cancelled' }), 'cancelled');
assert(!isEligibleStay({ status: 'no_show' }), 'no_show');
assert(!isEligibleStay({ status: 'confirmed' }), 'confirmed');
assert(isEligibleStay({ status: 'checked_in' }), 'checked_in');
assert(isEligibleStay({ status: '' }), 'legacy empty');

// overlap
const b = { check_in_date: '2026-01-28', check_out_date: '2026-02-05', nights: 8, status: 'checked_out' };
assert(overlappingNights(b, '2026-02-01', '2026-02-28') === 4, 'overlap nights expected 4');
assert(stayOverlapsPeriod(b, '2026-02-01', '2026-02-28'), 'overlaps');
assert(!stayOverlapsPeriod(b, '2026-03-01', '2026-03-31'), 'no overlap');

// same-day
const s = { check_in_date: '2026-02-10', check_out_date: '2026-02-10', status: 'checked_in' };
assert(overlappingNights(s, '2026-02-01', '2026-02-28') === 1, 'same-day 1 night');

const filtered = filterEligibleOverlapping(
  [b, { ...b, status: 'cancelled' }, s],
  '2026-02-01',
  '2026-02-28'
);
assert(filtered.length === 2, 'filter length');

console.log('businessRules tests OK');
