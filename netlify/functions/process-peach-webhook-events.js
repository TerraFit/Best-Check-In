const supabaseConfig = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is missing');
  return { url, key };
};

async function supabase(path, options = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  return response;
}

function contentOf(payload) {
  return payload?.content && typeof payload.content === 'object' ? payload.content : payload || {};
}

function statusOf(payload) {
  const content = contentOf(payload);
  return String(payload?.event_type || payload?.eventType || payload?.type || content?.status || payload?.status || '').toLowerCase();
}

function metadataOf(payload) {
  const content = contentOf(payload);
  return content?.metadata && typeof content.metadata === 'object' ? content.metadata : payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
}

export const handler = async () => {
  try {
    const response = await supabase("peach_webhook_events?processing_status=eq.received&order=received_at.asc&limit=100&select=id,webhook_id,event_type,event_status,payload,received_at");
    const events = await response.json();
    const results = [];

    for (const event of events || []) {
      try {
        const content = contentOf(event.payload);
        const metadata = metadataOf(event.payload);
        const eventStatus = statusOf(event.payload);
        const businessId = metadata.business_id || content?.metadata?.business_id || null;
        const mandateId = content?.mandate_id || content?.mandateId || content?.recurring_details?.mandate_id || content?.connector_mandate_id || null;
        const customerId = content?.customer_id || content?.customerId || metadata.customer_id || null;

        if (!businessId) {
          await supabase(`peach_webhook_events?id=eq.${event.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ processing_status: 'ignored', processed_at: new Date().toISOString(), processing_error: 'No business_id metadata' }) });
          results.push({ id: event.id, status: 'ignored' });
          continue;
        }

        const isSuccess = eventStatus.includes('succeeded') || eventStatus === 'success' || event.event_status === 'succeeded';
        const isFailure = eventStatus.includes('failed') || eventStatus === 'failure' || event.event_status === 'failed';
        const isTrialCardSetup = metadata.purpose === 'fastcheckin_trial_card_mandate';

        if (isSuccess && isTrialCardSetup) {
          await supabase(`businesses?id=eq.${encodeURIComponent(businessId)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              payment_provider: 'peach',
              payment_customer_id: customerId || `fc_${businessId}`,
              payment_mandate_id: mandateId,
              payment_method: 'card',
              payment_status: 'authorized',
              updated_at: new Date().toISOString(),
            }),
          });
        } else if (isSuccess) {
          await supabase(`businesses?id=eq.${encodeURIComponent(businessId)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ subscription_status: 'active', payment_status: 'paid', payment_failure_count: 0, payment_last_error: null, payment_grace_ends_at: null, last_payment_date: new Date().toISOString(), updated_at: new Date().toISOString() }),
          });
        } else if (isFailure) {
          await supabase(`businesses?id=eq.${encodeURIComponent(businessId)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ payment_status: 'failed', payment_last_error: content?.error_message || content?.errorMessage || event.event_status || 'Peach payment failed', updated_at: new Date().toISOString() }),
          });
        }

        await supabase(`peach_webhook_events?id=eq.${event.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ processing_status: 'processed', processed_at: new Date().toISOString(), processing_error: null }),
        });
        results.push({ id: event.id, status: 'processed', eventStatus });
      } catch (error) {
        console.error(`[process-peach-webhook-events] ${event.id}:`, error?.message || error);
        await supabase(`peach_webhook_events?id=eq.${event.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ processing_status: 'failed', processed_at: new Date().toISOString(), processing_error: String(error?.message || error).slice(0, 500) }),
        }).catch(() => undefined);
        results.push({ id: event.id, status: 'failed' });
      }
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ processed: results.length, results }) };
  } catch (error) {
    console.error('[process-peach-webhook-events] Fatal:', error?.message || error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Webhook processing failed' }) };
  }
};

export const config = { schedule: '*/5 * * * *' };
