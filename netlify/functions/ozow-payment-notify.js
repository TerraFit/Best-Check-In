import crypto from 'crypto';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const OZOW_SITE_CODE = process.env.OZOW_SITE_CODE;
const OZOW_PRIVATE_KEY = process.env.OZOW_PRIVATE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function safe(statusCode, error) {
  return { statusCode, headers: jsonHeaders, body: JSON.stringify({ error }) };
}

function getHeader(headers, name) {
  if (!headers) return '';
  const wanted = String(name).toLowerCase();
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === wanted);
  return key ? headers[key] : '';
}

function parseNotification(event) {
  const body = String(event.body || '');
  const contentType = String(getHeader(event.headers, 'content-type')).toLowerCase();
  if (contentType.includes('application/json')) return JSON.parse(body || '{}');
  return Object.fromEntries(new URLSearchParams(body));
}

function buildResponseHash(data) {
  const values = [
    data.SiteCode,
    data.TransactionId,
    data.TransactionReference,
    data.Amount,
    data.Status,
    data.Optional1,
    data.Optional2,
    data.Optional3,
    data.Optional4,
    data.Optional5,
    data.CurrencyCode,
    data.IsTest,
    data.StatusMessage,
  ].map((value) => value == null ? '' : String(value));

  return crypto
    .createHash('sha512')
    .update(`${values.join('')}${OZOW_PRIVATE_KEY}`.toLowerCase())
    .digest('hex');
}

function hashesMatch(expected, supplied) {
  if (typeof expected !== 'string' || typeof supplied !== 'string') return false;
  const a = Buffer.from(expected.toLowerCase());
  const b = Buffer.from(supplied.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function supabaseFetch(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Server database configuration is missing');
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: jsonHeaders, body: '' };
  if (event.httpMethod !== 'POST') return safe(405, 'Method not allowed');

  try {
    if (!OZOW_SITE_CODE || !OZOW_PRIVATE_KEY) {
      console.error('Ozow notification configuration is incomplete');
      return safe(500, 'Payment notification is not configured');
    }

    const data = parseNotification(event);
    const suppliedHash = data.Hash || data.HashCheck;
    if (!suppliedHash || !hashesMatch(buildResponseHash(data), suppliedHash)) {
      console.error('Ozow notification hash verification failed');
      return safe(400, 'Invalid payment notification');
    }

    if (String(data.SiteCode) !== String(OZOW_SITE_CODE)) {
      console.error('Ozow notification site mismatch');
      return safe(400, 'Invalid payment notification');
    }

    const transactionId = String(data.TransactionReference || '').trim();
    if (!transactionId) return safe(400, 'Invalid payment notification');

    const transactionResponse = await supabaseFetch(
      `transactions?id=eq.${encodeURIComponent(transactionId)}&gateway=eq.ozow&select=id,business_id,plan_id,billing_cycle,amount,status&limit=1`
    );
    if (!transactionResponse.ok) {
      console.error('Ozow transaction lookup failed:', transactionResponse.status);
      return safe(503, 'Unable to process payment notification');
    }

    const transaction = (await transactionResponse.json())[0];
    if (!transaction) {
      console.error('Ozow transaction not found:', transactionId);
      return safe(200, 'Notification received');
    }

    const receivedAmount = Number(data.Amount);
    const expectedAmount = Number(transaction.amount);
    if (!Number.isFinite(receivedAmount) || Math.abs(receivedAmount - expectedAmount) > 0.001 || String(data.CurrencyCode || '').toUpperCase() !== 'ZAR') {
      console.error('Ozow notification amount/currency mismatch:', transactionId);
      return safe(400, 'Invalid payment notification');
    }

    if (String(data.Status).toLowerCase() !== 'complete') {
      const status = String(data.Status || '').toLowerCase();
      const mappedStatus = ['cancelled', 'error', 'abandoned', 'voided'].includes(status) ? 'failed' : 'pending';
      await supabaseFetch(`transactions?id=eq.${encodeURIComponent(transactionId)}&gateway=eq.ozow`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: mappedStatus, gateway_response: JSON.stringify({ status: data.Status, statusMessage: data.StatusMessage || null }) }),
      });
      return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ received: true }) };
    }

    if (transaction.status !== 'completed') {
      const updateResponse = await supabaseFetch(`transactions?id=eq.${encodeURIComponent(transactionId)}&gateway=eq.ozow&status=eq.pending`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'completed', paid_at: new Date().toISOString(), gateway_response: JSON.stringify({ transactionId: data.TransactionId, status: data.Status }) }),
      });
      if (!updateResponse.ok) {
        console.error('Ozow transaction completion update failed:', updateResponse.status);
        return safe(503, 'Unable to process payment notification');
      }

      const dueDate = new Date();
      if (transaction.billing_cycle === 'yearly') dueDate.setFullYear(dueDate.getFullYear() + 1);
      else dueDate.setMonth(dueDate.getMonth() + 1);

      const businessUpdate = await supabaseFetch(`businesses?id=eq.${encodeURIComponent(transaction.business_id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          subscription_status: 'active',
          current_plan: transaction.plan_id,
          billing_cycle: transaction.billing_cycle,
          payment_status: 'paid',
          last_payment_date: new Date().toISOString(),
          payment_due_date: dueDate.toISOString(),
          trial_end: null,
        }),
      });
      if (!businessUpdate.ok) {
        console.error('Ozow business subscription update failed:', businessUpdate.status);
        return safe(503, 'Unable to process payment notification');
      }
    }

    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error('Ozow notification error:', error?.message || error);
    return safe(500, 'Unable to process payment notification');
  }
};

export { buildResponseHash };
