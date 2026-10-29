import crypto from 'node:crypto';

const WEBHOOK_URL = 'https://fastcheckin.co.za/.netlify/functions/peach-webhook';

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}

function getHeader(headers = {}, wanted) {
  const key = Object.keys(headers).find((name) => name.toLowerCase() === wanted.toLowerCase());
  return key ? String(headers[key] ?? '') : '';
}

function verifyLegacyHmac({ headers, rawBody, secret }) {
  const timestamp = getHeader(headers, 'x-webhook-timestamp');
  const webhookId = getHeader(headers, 'x-webhook-id');
  const received = getHeader(headers, 'x-webhook-signature');
  const algorithm = getHeader(headers, 'x-webhook-signature-algorithm').toLowerCase();
  if (!timestamp || !webhookId || !received || (algorithm && algorithm !== 'hmac-sha256')) return false;

  const message = `${timestamp}.${webhookId}.${WEBHOOK_URL}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const normalise = (value) => value.trim().replace(/^sha256=/i, '').toLowerCase();
  const expectedNormalised = normalise(expected);
  const receivedNormalised = normalise(received);
  if (!/^[a-f0-9]{64}$/.test(receivedNormalised)) return false;
  return crypto.timingSafeEqual(Buffer.from(expectedNormalised, 'hex'), Buffer.from(receivedNormalised, 'hex'));
}

function parsePayload(rawBody, contentType = '') {
  if (!rawBody.trim()) return null;
  if (contentType.toLowerCase().includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }
  try { return JSON.parse(rawBody); } catch { return null; }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function persistEvent({ webhookId, payload, rawBody }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase server configuration is missing');

  const content = payload?.content && typeof payload.content === 'object' ? payload.content : {};
  const status = content.status ?? payload?.status ?? payload?.paymentStatus ?? payload?.event?.status ?? null;
  const eventType = payload?.event_type ?? payload?.eventType ?? payload?.type ?? payload?.event?.type ?? null;
  const profileId = content.profile_id ?? content.profileId ?? payload?.profile_id ?? payload?.profileId ?? null;

  const result = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/peach_webhook_events?on_conflict=webhook_id`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify([{
        webhook_id: webhookId,
        profile_id: profileId,
        event_type: eventType,
        event_status: status,
        payload: payload && typeof payload === 'object' ? payload : { value: payload },
        raw_body: rawBody,
      }]),
    },
  );
  if (!result.ok) {
    const detail = await result.text();
    throw new Error(`Supabase webhook inbox insert failed (${result.status}): ${detail.slice(0, 300)}`);
  }
}

export const handler = async (event) => {
  const method = String(event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return response(200, { ok: true, service: 'peach-webhook', status: 'ready' });
  }
  if (method !== 'POST') return response(405, { ok: false, error: 'Method not allowed' });

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : String(event.body || '');
  const headers = event.headers || {};
  const contentType = getHeader(headers, 'content-type');

  // Some Peach dashboard validation attempts send an empty POST body. Treat
  // that as a URL reachability probe only; never record it as a payment event.
  if (!rawBody.trim()) {
    return response(200, { received: true, validation: true });
  }

  const payload = parsePayload(rawBody, contentType);

  // Peach's dashboard validates a webhook URL with an unsigned verificationCode
  // probe. Acknowledge the probe, but never persist it as a payment event.
  if (
    !getHeader(headers, 'x-webhook-signature') &&
    payload && typeof payload === 'object' &&
    typeof payload.verificationCode === 'string'
  ) {
    return response(200, { received: true });
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return response(400, { ok: false, error: 'Expected a JSON or form-encoded webhook payload' });
  }

  // Current Peach Orchestration webhooks use profile-configured custom HTTP
  // headers for endpoint authentication. If a shared token is configured in
  // Netlify, require the matching x-fastcheckin-webhook-token header.
  const configuredToken = process.env.PEACH_WEBHOOK_AUTH_TOKEN;
  const suppliedToken = getHeader(headers, 'x-fastcheckin-webhook-token');
  const hasLegacySignature = Boolean(getHeader(headers, 'x-webhook-signature'));
  if (configuredToken && !hasLegacySignature && !safeEqual(suppliedToken, configuredToken)) {
    return response(401, { ok: false, error: 'Invalid webhook authentication' });
  }

  // Keep compatibility with legacy Checkout webhooks if the signing secret is
  // configured. Orchestration payloads are identified by event_id/event_type.
  if (hasLegacySignature) {
    const secret = process.env.PEACH_WEBHOOK_SECRET;
    if (!secret || !verifyLegacyHmac({ headers, rawBody, secret })) {
      return response(401, { ok: false, error: 'Invalid webhook signature' });
    }
  }

  const webhookId = getHeader(headers, 'x-webhook-id') || payload.event_id || payload.eventId || payload.id;
  if (!webhookId || typeof webhookId !== 'string') {
    return response(400, { ok: false, error: 'Missing webhook event ID' });
  }

  try {
    await persistEvent({ webhookId, payload, rawBody });
    // This inbox only records delivery. It does not activate subscriptions;
    // payment status must be reconciled against Peach before billing changes.
    return response(200, { received: true });
  } catch (error) {
    console.error('[peach-webhook] Persistence failed:', error?.message || 'unknown error');
    return response(503, { ok: false, error: 'Webhook could not be persisted' });
  }
};
