import auth from './_auth.cjs';
import { v4 as uuidv4 } from 'uuid';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);
  const allowed = isPlatform
    ? requirePlatformPermission(principal, 'platform:businesses:write')
    : requireBusinessPermission(principal, 'canManageSettings');
  if (!allowed) return authFailure({ status: 403, error: 'Forbidden' }, headers);

  try {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) }; }

    const requestedBusinessId = typeof body.businessId === 'string' ? body.businessId.trim() : '';
    const tenant = resolveTenant(principal, requestedBusinessId || undefined);
    if (!tenant.ok) return authFailure(tenant, headers);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const authHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };
    const encodedBusinessId = encodeURIComponent(tenant.businessId);
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodedBusinessId}&select=id,trading_name,email,status&limit=1`,
      { headers: authHeaders }
    );

    if (!businessResponse.ok) {
      console.error('Business lookup failed:', businessResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to load business' }) };
    }

    const businesses = await businessResponse.json();
    const business = businesses?.[0];
    if (!business) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };

    const setupToken = uuidv4();
    const tokenResponse = await fetch(`${supabaseUrl}/rest/v1/setup_tokens`, {
      method: 'POST',
      headers: { ...authHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify([{
        token: setupToken,
        business_id: business.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }])
    });

    if (!tokenResponse.ok) {
      console.error('Setup token creation failed:', tokenResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create setup credentials' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Credentials ready',
        setupLink: `https://fastcheckin.netlify.app/setup/${setupToken}`,
        note: 'This link should be delivered securely to the business owner'
      })
    };
  } catch (error) {
    console.error('Unhandled business credential error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
