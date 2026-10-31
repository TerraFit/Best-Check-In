import { Resend } from 'resend';
import { getPlanPricing, normalizePlanId } from './lib/packages.js';

const DAY = 24 * 60 * 60 * 1000;
const FROM = 'FastCheckin <trial@fastcheckin.co.za>';
const BASE_URL = 'https://fastcheckin.co.za';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is missing');
  return { url, key };
}

async function supabase(path, options = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase ${options.method || 'GET'} ${path} failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
  return response;
}

function wholeDaysUntil(date, now = new Date()) {
  return Math.ceil((date.getTime() - now.getTime()) / DAY);
}

function wholeDaysSince(date, now = new Date()) {
  return Math.floor((now.getTime() - date.getTime()) / DAY);
}

function displayDate(value) {
  return new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function sendOnce(business, eventKey, subject, html) {
  const inserted = await supabase('subscription_email_events', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify([{ business_id: business.id, event_key: eventKey, recipient: business.email }]),
  });
  const rows = await inserted.json().catch(() => []);
  if (!Array.isArray(rows) || rows.length === 0) return false;
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({ from: FROM, to: [business.email], subject, html });
  return true;
}

function emailShell(title, body, ctaLabel = 'Open FastCheckIn', ctaPath = '/business/billing') {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#292524"><div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden"><div style="padding:28px;text-align:center;background:#f59e0b;color:#fff"><h1 style="margin:0">FastCheckIn</h1></div><div style="padding:32px"><h2 style="margin-top:0">${title}</h2>${body}<p style="text-align:center;margin:28px 0"><a href="${BASE_URL}${ctaPath}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">${ctaLabel} →</a></p><p style="font-size:12px;color:#78716c">You can cancel your subscription at any time from your billing settings.</p></div></div></body></html>`;
}

async function updateBusiness(id, patch) {
  await supabase(`businesses?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

async function attemptPeachCharge(business, amountMajor, currency) {
  const apiKey = process.env.PEACH_ORCHESTRATION_API_KEY;
  const profileId = process.env.PEACH_PROFILE_ID;
  if (!apiKey || !profileId) throw new Error('Peach Orchestration credentials are not configured');
  if (!business.payment_customer_id || !business.payment_mandate_id) {
    const error = new Error('No Peach recurring payment mandate is stored for this business');
    error.code = 'NO_MANDATE';
    throw error;
  }

  const amount = Math.round(Number(amountMajor) * 100);
  const response = await fetch('https://app.next.peachpayments.com/api/payments', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_id: profileId,
      amount,
      currency,
      customer_id: business.payment_customer_id,
      recurring_details: { mandate_id: business.payment_mandate_id },
      mit_category: 'recurring',
      capture_method: 'automatic',
      confirm: true,
      description: `FastCheckIn ${normalizePlanId(business.current_plan)} subscription`,
      metadata: { business_id: business.id, billing_cycle: business.billing_cycle || 'monthly' },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || ['failed', 'canceled'].includes(data.status)) {
    const error = new Error(data.error_message || `Peach payment failed (${response.status})`);
    error.code = data.error_code || `HTTP_${response.status}`;
    error.providerPaymentId = data.id || null;
    throw error;
  }
  return data;
}

async function processTrial(business, now) {
  if (!business.trial_end) return { action: 'ignored', reason: 'no_trial_end' };
  const end = new Date(business.trial_end);
  const daysLeft = wholeDaysUntil(end, now);
  const trialStart = business.trial_start ? new Date(business.trial_start) : null;
  const daysSinceStart = trialStart ? wholeDaysSince(trialStart, now) : null;

  if (end > now) {
    const jobs = [];
    if (daysSinceStart === 1) jobs.push(sendOnce(business, `trial-day-1:${business.trial_end}`, 'Welcome to FastCheckIn — your trial has started', emailShell('Your 14-day FastCheckIn trial is underway', `<p>Welcome to FastCheckIn, <strong>${business.trading_name}</strong>.</p><p>Your trial ends on <strong>${displayDate(business.trial_end)}</strong>.</p><p>Your selected <strong>${normalizePlanId(business.current_plan)}</strong> plan will be billed after the trial unless you cancel before the trial ends.</p>`)));
    if (daysSinceStart === 3) jobs.push(sendOnce(business, `trial-day-3:${business.trial_start}`, 'Need help setting up FastCheckIn?', emailShell('Need a hand getting started?', `<p>You are three days into your FastCheckIn trial.</p><p>If you need assistance setting up your property, rooms, staff or guest check-in flow, we are here to help.</p>`)));
    if (daysLeft === 7) jobs.push(sendOnce(business, `trial-remaining-7:${business.trial_end}`, 'You have 7 days left on your FastCheckIn trial', emailShell('You have 7 days left', `<p>Your FastCheckIn trial ends on <strong>${displayDate(business.trial_end)}</strong>.</p><p>You have <strong>7 days remaining</strong> to explore the platform.</p>`)));
    if (daysLeft === 3) jobs.push(sendOnce(business, `trial-remaining-3:${business.trial_end}`, 'Your FastCheckIn trial ends in 3 days', emailShell('Your trial ends soon', `<p>Your FastCheckIn trial ends on <strong>${displayDate(business.trial_end)}</strong>.</p><p>Add your card details now to avoid any interruption when your trial ends.</p>`)));
    if (daysLeft === 1) jobs.push(sendOnce(business, `trial-remaining-1:${business.trial_end}`, 'Your FastCheckIn trial ends tomorrow', emailShell('Your trial ends tomorrow', `<p>Your 14-day trial ends tomorrow, <strong>${displayDate(business.trial_end)}</strong>.</p><p>Unless you cancel, we will attempt to charge your saved payment method for your selected plan.</p>`)));
    await Promise.all(jobs);
    return { action: 'trial_reminders', daysLeft };
  }

  const period = business.trial_end;
  const existing = await supabase(`subscription_payment_attempts?business_id=eq.${encodeURIComponent(business.id)}&billing_period_start=eq.${encodeURIComponent(period)}&attempt_number=eq.1&select=id,status,provider_payment_id&limit=1`);
  const attempts = await existing.json();

  if (!attempts?.length) {
    const pricing = getPlanPricing(normalizePlanId(business.current_plan), business.billing_cycle || 'monthly', business.total_rooms);
    const amount = pricing.amount;
    const currency = pricing.currency || 'ZAR';
    let status = 'failed';
    let providerPaymentId = null;
    let errorCode = null;
    let errorMessage = null;

    try {
      const payment = await attemptPeachCharge(business, amount, currency);
      status = payment.status || 'succeeded';
      providerPaymentId = payment.id || payment.payment_id || null;
      if (status === 'succeeded') {
        const due = new Date(now);
        if ((business.billing_cycle || 'monthly') === 'yearly') due.setFullYear(due.getFullYear() + 1);
        else due.setMonth(due.getMonth() + 1);
        await supabase('subscription_payment_attempts', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ business_id: business.id, billing_period_start: period, amount: Math.round(Number(amount) * 100), currency, provider: 'peach', provider_payment_id: providerPaymentId, status, attempt_number: 1 }]) });
        await updateBusiness(business.id, { subscription_status: 'active', payment_status: 'paid', payment_attempted_at: now.toISOString(), payment_failure_count: 0, payment_last_error: null, payment_grace_ends_at: null, payment_due_date: due.toISOString(), last_payment_date: now.toISOString(), trial_end: null });
        return { action: 'payment_succeeded' };
      }
      errorMessage = `Peach returned status ${status}`;
    } catch (error) {
      errorCode = error?.code || 'PAYMENT_FAILED';
      errorMessage = error?.message || 'Payment failed';
      providerPaymentId = error?.providerPaymentId || null;
    }

    await supabase('subscription_payment_attempts', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ business_id: business.id, billing_period_start: period, amount: Math.round(Number(amount) * 100), currency, provider: 'peach', provider_payment_id: providerPaymentId, status, error_code: errorCode, error_message: errorMessage, attempt_number: 1 }]) });
    const graceEnd = new Date(end.getTime() + 30 * DAY);
    await updateBusiness(business.id, { subscription_status: 'checkin_only', payment_status: 'failed', payment_attempted_at: now.toISOString(), payment_failure_count: 1, payment_last_error: errorMessage, payment_grace_ends_at: graceEnd.toISOString() });
    await sendOnce(business, `payment-failed-day-0:${period}`, 'We could not process your FastCheckIn payment', emailShell('Your payment needs attention', `<p>Your free trial has ended and we attempted to start your <strong>${normalizePlanId(business.current_plan)}</strong> subscription.</p><p>We could not complete the payment. Guest check-in will continue for 30 days, and you can still view your dashboard overview and guest activity. Other dashboard features are temporarily locked.</p><p>Please update your payment details as soon as possible.</p>`, 'Fix payment', '/business/billing'));
    return { action: 'payment_failed', errorCode };
  }

  return processPastDue(business, end, now);
}

async function processPastDue(business, trialEnd, now) {
  const day = wholeDaysSince(trialEnd, now);
  if (day < 1) return { action: 'past_due_day_0' };

  if (day >= 1 && day <= 5) {
    const subject = day === 5 ? 'Final warning — restore your FastCheckIn subscription' : `Payment failed — FastCheckIn reminder day ${day}`;
    await sendOnce(business, `payment-failed-day-${day}:${business.trial_end}`, subject, emailShell(day === 1 ? 'Your FastCheckIn payment failed' : 'Your FastCheckIn payment is still outstanding', `<p>We still have not received payment for your FastCheckIn subscription.</p><p>Guest check-in remains active during the 30-day limited-access period. Your dashboard overview remains available, but other features are locked. Please update your payment details to restore full access.</p>` , 'Update payment', '/business/billing'));
    return { action: 'payment_grace', day };
  }

  if (day >= 30 && business.subscription_status !== 'restricted') {
    await updateBusiness(business.id, { subscription_status: 'restricted' });
    await sendOnce(business, `payment-restricted:${business.trial_end}`, 'Your FastCheckIn account has been restricted', emailShell('Your account has been restricted', `<p>Your 30-day limited-access period has ended and the subscription remains unpaid.</p><p>Your data is retained, but guest check-in and dashboard access are now restricted until payment is resolved.</p>`, 'Restore access', '/business/billing'));
    return { action: 'restricted', day };
  }

  if (day === 5) {
    await sendOnce(business, `payment-final-warning:${business.trial_end}`, 'Final payment warning — FastCheckIn account restricted', emailShell('Final payment warning', `<p>Your FastCheckIn account is in limited-access mode because the subscription remains unpaid.</p><p>Resolve the payment issue now to avoid full account restriction after the 30-day period.</p>`, 'Restore access', '/business/billing'));
    return { action: 'final_warning', day };
  }

  return { action: 'restricted', day };
}

export const handler = async () => {
  try {
    const response = await supabase("businesses?subscription_status=in.(trial,trialing,past_due,checkin_only,restricted)&select=id,trading_name,email,current_plan,billing_cycle,total_rooms,subscription_status,trial_start,trial_end,payment_customer_id,payment_mandate_id&order=trial_end.asc");
    const businesses = await response.json();
    const now = new Date();
    const results = [];
    for (const business of businesses || []) {
      try {
        results.push({ id: business.id, ...(await processTrial(business, now)) });
      } catch (error) {
        console.error(`[subscription-lifecycle] ${business.id}:`, error?.message || error);
        results.push({ id: business.id, action: 'error', error: error?.message || 'unknown error' });
      }
    }
    return json(200, { processed: results.length, results });
  } catch (error) {
    console.error('[subscription-lifecycle] Fatal error:', error?.message || error);
    return json(500, { error: 'Subscription lifecycle processing failed' });
  }
};

export const config = { schedule: '0 9 * * *' };
