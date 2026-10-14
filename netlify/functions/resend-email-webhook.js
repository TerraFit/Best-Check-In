import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseFetch, supabaseInsert, supabaseUpdate } from './lib/supabase-rest.js';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

function verifySignature(event, rawBody) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = event.headers?.['svix-id'] || event.headers?.['Svix-Id'];
  const timestamp = event.headers?.['svix-timestamp'] || event.headers?.['Svix-Timestamp'];
  const signatures = event.headers?.['svix-signature'] || event.headers?.['Svix-Signature'];
  if (!id || !timestamp || !signatures) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 5 * 60) return false;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', secretBytes).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
  return signatures.split(' ').some(part => {
    const candidate = part.split(',')[1];
    if (!candidate) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(candidate);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

const eventMap = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
  'email.suppressed': 'failed'
};
const priority = { failed: 0, sent: 1, delivered: 2, opened: 3, clicked: 4, bounced: 5, complained: 6 };

export const handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { success: false, error: 'Method Not Allowed' });
  const rawBody = event.body || '';
  if (!verifySignature(event, rawBody)) return reply(401, { success: false, error: 'Invalid webhook signature' });
  let payload;
  try { payload = JSON.parse(rawBody); } catch { return reply(400, { success: false, error: 'Invalid JSON' }); }
  const eventId = event.headers?.['svix-id'] || event.headers?.['Svix-Id'];
  const eventType = String(payload.type || '');
  const status = eventMap[eventType];
  const data = payload.data || {};
  const resendId = String(data.email_id || data.id || '').trim();
  if (!status || !resendId) return reply(200, { success: true, ignored: true });
  const occurredAt = data.created_at || payload.created_at || new Date().toISOString();
  try {
    const duplicate = await supabaseFetch(`website_email_events?select=event_id&event_id=eq.${encodeURIComponent(eventId)}&limit=1`);
    if (Array.isArray(duplicate) && duplicate.length) return reply(200, { success: true, duplicate: true });
    const rows = await supabaseFetch(`website_enquiry_emails?select=id,send_status&resend_email_id=eq.${encodeURIComponent(resendId)}&limit=1`);
    const row = Array.isArray(rows) ? rows[0] : null;
    // Ask Resend to retry if its webhook beats the API response/log insert.
    if (!row) return reply(500, { success: false, error: 'Email record not available yet; retry webhook' });
    await supabaseInsert('website_email_events', {
      event_id: eventId, resend_email_id: resendId, event_type: eventType,
      occurred_at: occurredAt,
      payload: { type: eventType, email_id: resendId, created_at: occurredAt, click: data.click ? { link: data.click.link } : undefined }
    }, false);
    const update = { last_event_at: occurredAt };
    if (priority[status] >= priority[row.send_status || 'sent']) update.send_status = status;
    const column = { delivered: 'delivered_at', opened: 'opened_at', clicked: 'clicked_at', bounced: 'bounced_at', complained: 'complained_at' }[status];
    if (column) update[column] = occurredAt;
    await supabaseUpdate('website_enquiry_emails', row.id, update);
    return reply(200, { success: true });
  } catch (error) {
    console.error('Resend webhook processing failed:', error?.message || error);
    return reply(500, { success: false, error: 'Webhook processing failed' });
  }
};
