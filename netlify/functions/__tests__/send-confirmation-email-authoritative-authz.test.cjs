const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.RESEND_API_KEY = 'test-resend-key';

function event(body) {
  return {
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify(body)
  };
}

async function load() {
  return import(`../send-confirmation-email.ts?test=${Date.now()}-${Math.random()}`);
}

function jsonResponse(data, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    async json() { return data; },
    async text() { return JSON.stringify(data); }
  };
}

test('send-confirmation-email rejects anonymous requests without booking capability', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return jsonResponse([]);
  };

  try {
    const { handler } = await load();
    const result = await handler(event({ booking_id: 'booking-a' }));
    assert.equal(result.statusCode, 400);
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('send-confirmation-email rejects a valid token bound to a different booking', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return jsonResponse([]);
  };

  try {
    const { handler } = await load();
    const result = await handler(event({
      booking_id: 'booking-b',
      indemnity_token: 'token-for-booking-a'
    }));
    assert.equal(result.statusCode, 403);
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test('send-confirmation-email uses authoritative booking and business data', async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (calls.length === 1) {
      return jsonResponse([{ booking_id: 'booking-a', business_id: 'biz-a' }]);
    }
    if (calls.length === 2) {
      return jsonResponse([{
        id: 'booking-a',
        business_id: 'biz-a',
        guest_name: 'Real Guest',
        guest_email: 'real@example.com',
        check_in_date: '2026-09-06',
        check_out_date: '2026-09-08',
        nights: 2,
        total_amount: 1800,
        marketing_consent: false
      }]);
    }
    if (calls.length === 3) {
      return jsonResponse([{
        trading_name: 'Real Lodge',
        logo_url: 'https://example.com/logo.png',
        newsletter_enabled: true,
        newsletter_title: 'Real Newsletter',
        newsletter_prize: 'Real Prize',
        newsletter_cta: 'Join',
        newsletter_terms: 'Real terms',
        newsletter_draw_date: '2026-12-01',
        newsletter_share_text: 'Real share text'
      }]);
    }
    if (calls.length === 4) {
      return jsonResponse({ id: 'email-1' });
    }
    return jsonResponse({});
  };

  try {
    const { handler } = await load();
    const result = await handler(event({
      booking_id: 'booking-a',
      indemnity_token: 'token-a',
      guest_name: 'ATTACKER NAME',
      guest_email: 'attacker@example.com',
      business_id: 'biz-attacker',
      business_name: 'Attacker Lodge',
      marketing_consent: true,
      check_in_date: '2099-01-01',
      nights: 999
    }));

    assert.equal(result.statusCode, 200);

    const resendRequest = calls[3];
    const resendBody = JSON.parse(resendRequest.options.body);
    assert.deepEqual(resendBody.to, ['real@example.com']);
    assert.match(resendBody.subject, /Real Lodge/);
    assert.match(resendBody.html, /Real Guest/);
    assert.doesNotMatch(resendBody.html, /ATTACKER NAME/);
    assert.doesNotMatch(resendBody.html, /Attacker Lodge/);

    // Stored consent is false, so the newsletter endpoint must not be called.
    assert.equal(calls.length, 4);
  } finally {
    global.fetch = originalFetch;
  }
});

test('send-confirmation-email uses stored marketing consent for newsletter subscription', async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (calls.length === 1) {
      return jsonResponse([{ booking_id: 'booking-a', business_id: 'biz-a' }]);
    }
    if (calls.length === 2) {
      return jsonResponse([{
        id: 'booking-a',
        business_id: 'biz-a',
        guest_name: 'Consenting Guest',
        guest_email: 'consent@example.com',
        check_in_date: '2026-09-06',
        check_out_date: '2026-09-07',
        nights: 1,
        total_amount: 900,
        marketing_consent: true
      }]);
    }
    if (calls.length === 3) {
      return jsonResponse([{
        trading_name: 'Consent Lodge',
        logo_url: null,
        newsletter_enabled: true,
        newsletter_title: null,
        newsletter_prize: null,
        newsletter_cta: null,
        newsletter_terms: null,
        newsletter_draw_date: null,
        newsletter_share_text: null
      }]);
    }
    if (calls.length === 4) {
      return jsonResponse({ id: 'email-2' });
    }
    return jsonResponse({});
  };

  try {
    const { handler } = await load();
    const result = await handler(event({
      booking_id: 'booking-a',
      indemnity_token: 'token-a',
      marketing_consent: false,
      guest_email: 'attacker@example.com'
    }));

    assert.equal(result.statusCode, 200);
    assert.equal(calls.length, 5);
    assert.match(calls[4].url, /newsletter_subscribers$/);
    const newsletterBody = JSON.parse(calls[4].options.body);
    assert.equal(newsletterBody.business_id, 'biz-a');
    assert.equal(newsletterBody.email, 'consent@example.com');
    assert.equal(newsletterBody.guest_name, 'Consenting Guest');
  } finally {
    global.fetch = originalFetch;
  }
});
