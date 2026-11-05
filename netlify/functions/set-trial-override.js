import auth from './_auth.cjs';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

const supabaseRequest = async (path, options = {}) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is missing');
  return fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const gate = auth.requirePlatformActor(event);
  if (!gate.ok || !auth.requirePlatformPermission(gate.principal, 'platform:subscriptions:write')) {
    return auth.authFailure(gate.ok ? { ok: false, status: 403, error: 'Subscription administration permission required' } : gate);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const businessId = String(body.businessId || '').trim();
    const reason = String(body.reason || '').trim();
    const addDays = Number(body.addDays);
    const requestedEnd = body.newTrialEnd ? new Date(body.newTrialEnd) : null;

    if (!businessId || !reason) return json(400, { error: 'businessId and reason are required' });
    if (!Number.isInteger(addDays) && !requestedEnd) return json(400, { error: 'Provide addDays or newTrialEnd' });
    if (Number.isInteger(addDays) && (addDays < 1 || addDays > 365)) return json(400, { error: 'addDays must be between 1 and 365' });
    if (requestedEnd && Number.isNaN(requestedEnd.getTime())) return json(400, { error: 'Invalid newTrialEnd' });

    const businessResponse = await supabaseRequest(
      `businesses?id=eq.${encodeURIComponent(businessId)}&select=id,trading_name,trial_end,subscription_status,current_plan&limit=1`,
    );
    if (!businessResponse.ok) throw new Error(`Business lookup failed (${businessResponse.status})`);
    const rows = await businessResponse.json();
    const business = rows?.[0];
    if (!business) return json(404, { error: 'Business not found' });

    const previousEnd = business.trial_end ? new Date(business.trial_end) : new Date();
    const base = previousEnd.getTime() > Date.now() ? previousEnd : new Date();
    const newEnd = requestedEnd || new Date(base.getTime() + addDays * 86400000);
    if (newEnd <= new Date()) return json(400, { error: 'New trial end must be in the future' });

    const actualAddedDays = Math.max(1, Math.ceil((newEnd.getTime() - previousEnd.getTime()) / 86400000));
    const updateResponse = await supabaseRequest(`businesses?id=eq.${encodeURIComponent(businessId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        trial_start: business.trial_end && previousEnd > new Date() ? undefined : new Date().toISOString(),
        trial_end: newEnd.toISOString(),
        subscription_status: 'trial',
        payment_status: 'pending',
        payment_grace_ends_at: null,
        payment_attempted_at: null,
        payment_failure_count: 0,
        payment_last_error: null,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!updateResponse.ok) throw new Error(`Business update failed (${updateResponse.status}): ${(await updateResponse.text()).slice(0, 300)}`);

    const auditResponse = await supabaseRequest('trial_extensions', {
      method: 'POST',
      body: JSON.stringify([{
        business_id: businessId,
        previous_trial_end: business.trial_end || null,
        new_trial_end: newEnd.toISOString(),
        added_days: actualAddedDays,
        reason,
        granted_by: gate.principal.userId || null,
      }]),
    });
    if (!auditResponse.ok) throw new Error(`Trial audit insert failed (${auditResponse.status})`);

    return json(200, {
      success: true,
      businessId,
      businessName: business.trading_name,
      previousTrialEnd: business.trial_end || null,
      newTrialEnd: newEnd.toISOString(),
      addedDays: actualAddedDays,
    });
  } catch (error) {
    console.error('[set-trial-override] Error:', error?.message || error);
    return json(500, { error: 'Trial extension could not be applied' });
  }
};
