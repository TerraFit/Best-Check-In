const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

async function loadFunction() { return import(`../get-business-branding.js?test=${Date.now()}-${Math.random()}`); }
function event(id, method = 'GET') { return { httpMethod: method, headers: {}, queryStringParameters: id === undefined ? {} : { id } }; }
function mockFetch(payload = [{ id: 'biz-a', trading_name: 'Test Lodge', logo_url: 'https://example.com/logo.png', hero_image_url: 'https://example.com/hero.jpg', slogan: 'Welcome', welcome_message: 'Hello', primary_color: '#111111', secondary_color: '#222222', newsletter_enabled: true, newsletter_title: 'Win a stay', newsletter_prize: 'Two nights', newsletter_cta: 'Subscribe', newsletter_terms: 'Terms', newsletter_draw_date: '2026-12-01', newsletter_share_text: 'Share' }], ok = true, status = 200) {
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url: String(url), options }); return { ok, status, json: async () => payload, text: async () => typeof payload === 'string' ? payload : JSON.stringify(payload) }; };
  return calls;
}

test('business branding: public GET succeeds without authentication', async () => {
  mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event('biz-a'));
  assert.equal(result.statusCode, 200);
});

test('business branding: missing id is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(undefined));
  assert.equal(result.statusCode, 400);
});

test('business branding: requested business id is encoded before database query', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  const result = await handler(event('biz/a?x=1'));
  assert.equal(result.statusCode, 200);
  assert.match(calls[0].url, /id=eq\.biz%2Fa%3Fx%3D1/);
});

test('business branding: response contains only explicitly public branding fields', async () => {
  const payload = [{ id: 'biz-a', trading_name: 'Test Lodge', logo_url: 'logo', subscription_tier: 'Business', service_paused: false, directors: ['SECRET'], email: 'private@example.com', phone: '+27110000000', physical_address: { street: 'SECRET' }, avg_price: 5000, total_rooms: 99 }];
  mockFetch(payload);
  const { handler } = await loadFunction();
  const result = await handler(event('biz-a'));
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(result.body);
  assert.deepEqual(body, { id: 'biz-a', trading_name: 'Test Lodge', logo_url: 'logo' });
  assert.equal('subscription_tier' in body, false);
  assert.equal('directors' in body, false);
  assert.equal('email' in body, false);
  assert.equal('phone' in body, false);
  assert.equal('physical_address' in body, false);
  assert.equal('avg_price' in body, false);
  assert.equal('total_rooms' in body, false);
});

test('business branding: database SELECT is restricted to public branding fields', async () => {
  const calls = mockFetch();
  const { handler } = await loadFunction();
  await handler(event('biz-a'));
  assert.match(calls[0].url, /select=id,trading_name,logo_url,hero_image_url,slogan,welcome_message,primary_color,secondary_color,newsletter_enabled,newsletter_title,newsletter_prize,newsletter_cta,newsletter_terms,newsletter_draw_date,newsletter_share_text/);
  assert.doesNotMatch(calls[0].url, /subscription_tier|directors|physical_address|avg_price|total_rooms/);
});

test('business branding: unknown business returns 404', async () => {
  mockFetch([]);
  const { handler } = await loadFunction();
  const result = await handler(event('missing'));
  assert.equal(result.statusCode, 404);
});

test('business branding: upstream failure is sanitized', async () => {
  mockFetch('SECRET database schema and credentials', false, 500);
  const { handler } = await loadFunction();
  const result = await handler(event('biz-a'));
  assert.equal(result.statusCode, 502);
  assert.doesNotMatch(result.body, /SECRET database schema and credentials/);
});

test('business branding: malformed upstream JSON is sanitized', async () => {
  global.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new Error('SECRET parser details'); }, text: async () => '' });
  const { handler } = await loadFunction();
  const result = await handler(event('biz-a'));
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /SECRET parser details/);
});

test('business branding: wrong method is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('biz-a', 'POST'));
  assert.equal(result.statusCode, 405);
});

test('business branding: OPTIONS remains public preflight', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(undefined, 'OPTIONS'));
  assert.equal(result.statusCode, 204);
});

test('business branding: public cache policy is present', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(undefined, 'OPTIONS'));
  assert.equal(result.headers['Cache-Control'], 'public, max-age=300');
});
