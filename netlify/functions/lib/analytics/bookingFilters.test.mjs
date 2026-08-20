/**
 * Regression tests for server-side booking filter query construction.
 * Mirrors the pure filter logic in get-business-bookings.js.
 */

function encodeParam(value) {
  return encodeURIComponent(String(value).trim());
}

function buildFilterQuery(params) {
  const {
    targetBusinessId,
    startDate,
    endDate,
    status,
    province,
    city,
    country,
    search,
  } = params;

  let q = `business_id=eq.${encodeParam(targetBusinessId)}`;

  if (startDate && endDate) {
    q += `&check_in_date=gte.${encodeParam(startDate)}&check_in_date=lte.${encodeParam(endDate)}`;
  } else if (startDate && !endDate) {
    q += `&check_in_date=gte.${encodeParam(startDate)}`;
  }

  if (status) q += `&status=eq.${encodeParam(status)}`;
  if (province) q += `&guest_province=eq.${encodeParam(province)}`;
  if (city) q += `&guest_city=eq.${encodeParam(city)}`;
  if (country) q += `&guest_country=eq.${encodeParam(country)}`;
  if (search) {
    const term = String(search).trim();
    if (term.length > 0) {
      const like = `*${term}*`;
      q += `&or=(guest_name.ilike.${encodeParam(like)},guest_email.ilike.${encodeParam(like)},guest_phone.ilike.${encodeParam(like)})`;
    }
  }

  return q;
}

function cleanFacetValues(rows, field) {
  const set = new Set();
  for (const row of rows || []) {
    let v = row[field];
    if (v == null) continue;
    v = String(v).trim().replace(/\.$/, '');
    if (!v) continue;
    set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// --- status filter ---
{
  const q = buildFilterQuery({
    targetBusinessId: 'biz-1',
    status: 'checked_in',
  });
  assert(q.includes('status=eq.checked_in'), 'status filter present');
  assert(q.includes('business_id=eq.biz-1'), 'business isolation');
}

// --- province + city + country ---
{
  const q = buildFilterQuery({
    targetBusinessId: 'biz-1',
    province: 'Gauteng',
    city: 'Johannesburg',
    country: 'South Africa',
  });
  assert(q.includes('guest_province=eq.Gauteng'), 'province');
  assert(q.includes('guest_city=eq.Johannesburg'), 'city');
  assert(q.includes('guest_country=eq.South%20Africa'), 'country encoded');
}

// --- multiple filters together ---
{
  const q = buildFilterQuery({
    targetBusinessId: 'biz-1',
    status: 'completed',
    province: 'Western Cape',
    city: 'Cape Town',
    country: 'South Africa',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  });
  assert(q.includes('status=eq.completed'), 'status');
  assert(q.includes('guest_province=eq.Western%20Cape'), 'province');
  assert(q.includes('guest_city=eq.Cape%20Town'), 'city');
  assert(q.includes('guest_country=eq.South%20Africa'), 'country');
  assert(q.includes('check_in_date=gte.2025-01-01'), 'start');
  assert(q.includes('check_in_date=lte.2025-12-31'), 'end');
}

// --- clearing filters: empty values ignored (handler pre-trims to null) ---
{
  const q = buildFilterQuery({
    targetBusinessId: 'biz-1',
    status: null,
    province: '',
    city: null,
    country: undefined,
  });
  assert(!q.includes('status='), 'empty status omitted');
  assert(!q.includes('guest_province='), 'empty province omitted');
  assert(!q.includes('guest_city='), 'null city omitted');
  assert(!q.includes('guest_country='), 'empty country omitted');
}

// --- search ---
{
  const q = buildFilterQuery({
    targetBusinessId: 'biz-1',
    search: 'Thabo',
  });
  assert(q.includes('or=(guest_name.ilike.'), 'search or');
  assert(q.includes('Thabo'), 'search term');
}

// --- facets clean null/blank ---
{
  const rows = [
    { guest_country: 'South Africa' },
    { guest_country: 'South Africa.' },
    { guest_country: '' },
    { guest_country: null },
    { guest_country: '  ' },
    { guest_country: 'Namibia' },
  ];
  const countries = cleanFacetValues(rows, 'guest_country');
  assert(countries.length === 2, 'deduped countries');
  assert(countries[0] === 'Namibia', 'sorted');
  assert(countries[1] === 'South Africa', 'trailing dot stripped');
}

console.log('bookingFilters tests OK');
