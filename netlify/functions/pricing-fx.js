import { supabaseFetch, createHandlerResponse } from './lib/supabase-rest.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return createHandlerResponse(405, { success: false, error: 'Method not allowed' });
  }

  try {
    const rows = await supabaseFetch(
      'pricing_fx_rates?select=currency_code,market_rate_zar_per_unit,buffer_percent,pricing_rate_zar_per_unit,effective_from,effective_until,source&effective_until=is.null&order=currency_code.asc'
    );

    const rates = Object.fromEntries(rows.map((row) => [row.currency_code, {
      marketRateZarPerUnit: Number(row.market_rate_zar_per_unit),
      bufferPercent: Number(row.buffer_percent),
      pricingRateZarPerUnit: Number(row.pricing_rate_zar_per_unit),
      effectiveFrom: row.effective_from,
      source: row.source,
    }]));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, rates }) };
  } catch (error) {
    console.error('pricing-fx failed:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Unable to load pricing exchange rates' }) };
  }
}
