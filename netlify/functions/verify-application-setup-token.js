import crypto from 'node:crypto';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ valid: false }) };

  const token = event.queryStringParameters?.token || '';
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
    return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: 'Service unavailable' }) };

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const response = await fetch(
      `${url}/rest/v1/business_account_setup_tokens?token_hash=eq.${tokenHash}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=business_id&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!response.ok) throw new Error(`Setup token lookup failed (${response.status})`);
    const rows = await response.json();
    if (!rows?.[0]?.business_id) return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };

    const businessResponse = await fetch(
      `${url}/rest/v1/businesses?id=eq.${encodeURIComponent(rows[0].business_id)}&status=in.(pending,approved)&select=id,trading_name,email&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!businessResponse.ok) throw new Error('Business lookup failed');
    const business = (await businessResponse.json())?.[0];
    return { statusCode: 200, headers, body: JSON.stringify({ valid: Boolean(business), businessName: business?.trading_name || '', email: business?.email || '' }) };
  } catch (error) {
    console.error('[verify-application-setup-token] Error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: 'Could not verify setup link' }) };
  }
};
