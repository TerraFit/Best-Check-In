const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..', '..');
const HANDLER_PATH = path.join(ROOT, 'netlify/functions/archive-old-bookings.js');

function loadHandler({ businesses = [], bookingCount = 0, archiveError = null } = {}) {
  const source = fs.readFileSync(HANDLER_PATH, 'utf8')
    .replace(/import\s+\{\s*createClient\s*\}\s+from\s+['"]@supabase\/supabase-js['"];?/, '')
    .replace(/export\s+const\s+handler\s*=\s*/, 'const handler = ');

  const calls = [];
  const client = {
    from(table) {
      const state = { table, filters: [] };
      calls.push(state);
      return {
        select() { return this; },
        eq(column, value) { state.filters.push([column, value]); return this; },
        lt(column, value) { state.filters.push([column, '<', value]); return this; },
        order() { return this; },
        limit() { return this; },
        insert() { return Promise.resolve({ error: null }); },
        delete() { return this; },
        in() { return Promise.resolve({ error: null }); },
        then(resolve) {
          if (table === 'businesses') return resolve({ data: businesses, error: null });
          if (table === 'bookings' && state.filters.some(([column]) => column === 'business_id')) {
            if (archiveError) return resolve({ data: null, error: archiveError });
            return resolve({ data: [], error: null, count: bookingCount });
          }
          return resolve({ data: [], error: null });
        }
      };
    }
  };

  const sandbox = {
    console,
    process: { env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_KEY: 'service-key' } },
    require(id) {
      if (id === '@supabase/supabase-js') return { createClient: () => client };
      throw new Error(`Unexpected require: ${id}`);
    }
  };

  const wrapped = `const createClient = () => client;\n${source}\nmodule.exports = { handler };`;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports, process, console, client) { ${wrapped}\n})(require, module, module.exports, process, console, client);`, sandbox, { filename: HANDLER_PATH });
  return { handler: module.exports.handler, calls };
}

test('scheduled archive no longer trusts caller-controlled x-nf-schedule or admin headers', async () => {
  const { handler } = loadHandler({ businesses: [] });
  const response = await handler({ headers: { 'x-nf-schedule': 'true', 'x-admin-key': 'attacker-controlled' } });
  assert.equal(response.statusCode, 200);
});

test('archive failure does not expose upstream database error details', async () => {
  const { handler } = loadHandler({
    businesses: [{ id: 'biz-a', trading_name: 'A', subscription_tier: 'Business', max_active_bookings: 20, archive_after_days: 30, auto_archive_enabled: true }],
    archiveError: { message: 'secret database connection details', code: 'PGRST999' }
  });
  const response = await handler({ headers: {} });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.errors.length, 1);
  assert.equal(body.errors[0].error, 'Failed to archive bookings for business');
  assert.equal(JSON.stringify(body).includes('secret database connection details'), false);
  assert.equal(JSON.stringify(body).includes('PGRST999'), false);
});
