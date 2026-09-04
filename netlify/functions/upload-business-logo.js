import auth from './_auth.cjs';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);
  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:businesses:write')) {
      return authFailure({ status: 403, error: 'Missing permission: platform:businesses:write' }, headers);
    }
  } else if (!requireBusinessPermission(principal, 'canManageSettings')) {
    return authFailure({ status: 403, error: 'Missing permission: canManageSettings' }, headers);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const businessId = resolveTenant(principal, body.businessId || body.business_id);
    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Business ID required' }) };
    }

    const logoUrl = body.logo_url == null ? null : String(body.logo_url).trim();
    if (logoUrl && logoUrl.length > 2048) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid logo URL' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Business logo configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ logo_url: logoUrl || null, updated_at: new Date().toISOString() })
    });

    if (!response.ok) {
      console.error('Business logo update failed:', response.status);
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to update logo' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Logo updated successfully' }) };
  } catch (error) {
    console.error('Error updating business logo:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
