/**
 * Regression tests for booking list filter query construction.
 * Mirrors get-business-bookings filter semantics (PostgREST before pagination).
 */

function encodeParam(value) {
  return encodeURIComponent(String(value));
}

function buildFilterQuery(params) {
  const {
    businessId,
    startDate,
    endDate,
    status,
    province,
    city,
    country,
    search,
    limit = 25,
    page = 1,
  } = params;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let q =
    `business_id=eq.${encodeParam(businessId)}` +
    `&order=check_in_date.desc` +
    `&limit=${parseInt(limit, 10)}` +
    `&offset=${offset}`;

  if (startDate && endDate) {
    q += `&check_in_date=gte.${startDate}&check_in_date=lte.${endDate}`;
  } else if (startDate && !endDate) {
    q += `&check_in_date=gte.${startDate}`;
  }

  if (status) {
    q += `&status=eq.${encodeParam(status)}`;
  }
  if (province) {
    q += `&guest_province=eq.${encodeParam(province)}`;
  }
  if (city) {
    q += `&guest_city=eq.${encodeParam(city)}`;
  }
  if (country) {
    const cleaned = String(country).replace(/\.+$/, '').trim();
    q += `&guest_country=eq.${encodeParam(cleaned)}`;
  }
  if (search) {
    const term = String(search).trim();
    if (term) {
      const encoded = encodeParam(`*${term}*`);
      q += `&or=(guest_name.ilike.${encoded},guest_email.ilike.${encoded},guest_phone.ilike.${encoded})`;
    }
  }
  return q;
}

function cleanFacetValues(rows, key) {
  const set = new Set();
  (rows || []).forEach((r) => {
    let v = r?.[key];
    if (v == null) return;
    v = String(v).trim();
    if (!v) return;
    if (key === 'guest_country') v = v.replace(/\.+$/, '').trim();
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// --- tests ---
const base = { businessId: 'biz-1', limit: 25, page: 1 };

const qStatus = buildFilterQuery({ ...base, status: 'checked_in' });
assert(qStatus.includes('status=eq.checked_in'), 'status filter');
assert(qStatus.includes('limit=25'), 'limit present');
assert(qStatus.includes('offset=0'), 'offset page 1');

const qMulti = buildFilterQuery({
  ...base,
  status: 'completed',
  province: 'Gauteng',
  city: 'Johannesburg',
  country: 'South Africa.',
});
assert(qMulti.includes('status=eq.completed'), 'multi status');
assert(qMulti.includes('guest_province=eq.Gauteng'), 'multi province');
assert(qMulti.includes('guest_city=eq.Johannesburg'), 'multi city');
assert(qMulti.includes('guest_country=eq.South%20Africa'), 'country trailing dot cleaned + encoded');
assert(!qMulti.includes('South Africa.'), 'raw trailing dot not in query');

const qClear = buildFilterQuery({ ...base, status: null, province: '', city: undefined });
assert(!qClear.includes('status='), 'empty status omitted');
assert(!qClear.includes('guest_province='), 'empty province omitted');
assert(!qClear.includes('guest_city='), 'empty city omitted');

const qSearch = buildFilterQuery({ ...base, search: 'smith & co' });
assert(qSearch.includes('or=(guest_name.ilike.'), 'search or group');
assert(qSearch.includes('guest_email.ilike.'), 'search email');
assert(qSearch.includes('guest_phone.ilike.'), 'search phone');

const qPage2 = buildFilterQuery({ ...base, page: 2, limit: 10 });
assert(qPage2.includes('limit=10'), 'page2 limit');
assert(qPage2.includes('offset=10'), 'page2 offset');

const facets = cleanFacetValues(
  [
    { guest_country: 'South Africa.' },
    { guest_country: 'South Africa' },
    { guest_country: null },
    { guest_country: '  ' },
    { guest_country: 'Namibia' },
  ],
  'guest_country'
);
assert(facets.length === 2, 'facet dedupe + blank drop');
assert(facets[0] === 'Namibia' || facets[1] === 'Namibia', 'namibia present');
assert(facets.includes('South Africa'), 'cleaned SA');
assert(!facets.includes('South Africa.'), 'dot stripped');

const blankCity = cleanFacetValues([{ guest_city: '   ' }, { guest_city: 'Cape Town' }], 'guest_city');
assert(blankCity.length === 1 && blankCity[0] === 'Cape Town', 'blank city omitted');

console.log('bookingFilters tests OK');
