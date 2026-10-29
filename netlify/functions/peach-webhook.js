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

function verifySignature({ headers, rawBody, secret }) {
  const timestamp = getHeader(headers, 'x-webhook-timestamp');
  const webhookId = getHeader(headers, 'x-webhook-id');
  const received = getHeader(headers, 'x-webhook-signature');
  const algorithm = getHeader(headers, 'x-webhook-signature-algorithm').toLowerCase();

  if (!timestamp || !webhookId || !received || (algorithm && algorithm !== 'hmac-sha256')) {
    return false;
  }

  const message = `${timestamp}.${webhookId}.${WEBHOOK_URL}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');

  const normalise = (value) => value.trim().replace(/^sha256=/i, '').toLowerCase();
  const expectedNormalised = normalise(expected);
  const receivedNormalised = normalise(received);

  if (!/^[a-f0-9]{64}$/.test(receivedNormalised)) return false;
  return crypto.timingSafeEqual(Buffer.from(expectedNormalised, 'hex'), Buffer.from(receivedNormalised, 'hex'));
}

function parsePayload(rawBody, contentType = '') {
  if (contentType.toLowerCase().includes('application/json')) {
    try { return JSON.parse(rawBody); } catch { return null; }
  }
  if (contentType.toLowerCase().includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }
  try { return JSON.parse(rawBody); } catch { return { raw: rawBody }; }
}

async function persistEvent({ webhookId, payload, rawBody }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase server configuration is missing');
  }

  const status = payload?.status ?? payload?.paymentStatus ?? payload?.event?.status ?? null;
  const eventType = payload?.type ?? payload?.eventType ?? payload?.event?.type ?? null;
  const profileId = payload?.profileId ?? payload?.profile_id ?? null;

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
  if (method !== 'POST') {
    return response(405, { ok: false, error: 'Method not allowed' });
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : String(event.body || '');
  const headers = event.headers || {};
  const payload = parsePayload(rawBody, getHeader(headers, 'content-type'));

  // Peach may send a lightweight endpoint-validation probe before signing is
  // enabled. Acknowledge only the documented verificationCode probe; never
  // treat it as a payment event or update subscription state.
  if (
    !getHeader(headers, 'x-webhook-signature') &&
    (
      rawBody.trim() === '' ||
      (payload && typeof payload === 'object' && typeof payload.verificationCode === 'string')
    )
  ) {
    return response(200, { received: true });
  }

  const secret = process.env.PEACH_WEBHOOK_SECRET;
  if (!secret) {
    return response(503, { ok: false, error: 'Webhook verification is not configured' });
  }

  if (!verifySignature({ headers, rawBody, secret })) {
    return response(401, { ok: false, error: 'Invalid webhook signature' });
  }

  const webhookId = getHeader(headers, 'x-webhook-id');
  if (!webhookId) return response(400, { ok: false, error: 'Missing webhook ID' });

  try {
    await persistEvent({ webhookId, payload, rawBody });
    // Acknowledge only after durable storage. Subscription changes are handled
    // separately from receipt and must not be inferred from this webhook alone.
    return response(200, { received: true });
  } catch (error) {
    console.error('[peach-webhook] Persistence failed:', error?.message || 'unknown error');
    return response(503, { ok: false, error: 'Webhook could not be persisted' });
  }
};
