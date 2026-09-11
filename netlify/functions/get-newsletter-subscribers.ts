import auth from './_auth.cjs';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);
  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) {
      return authFailure({ status: 403, error: 'Missing permission: platform:businesses:read' }, headers);
    }
  } else if (!requireBusinessPermission(principal, 'canManageSettings')) {
    return authFailure({ status: 403, error: 'Missing permission: canManageSettings' }, headers);
  }

  try {
    const requestedBusinessId = typeof event.queryStringParameters?.businessId === 'string'
      ? event.queryStringParameters.businessId.trim()
      : '';
    if (!requestedBusinessId && isPlatform) {
      return authFailure({ status: 400, error: 'businessId required' }, headers);
    }

    const scope = resolveTenant(principal, requestedBusinessId || undefined);
    if (!scope.ok) return authFailure(scope, headers);
    const businessId = scope.businessId;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Newsletter subscriber configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const query = new URLSearchParams({
      business_id: `eq.${businessId}`,
      order: 'created_at.desc'
    });
    const response = await fetch(`${supabaseUrl}/rest/v1/newsletter_subscribers?${query.toString()}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Newsletter subscriber fetch failed:', response.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch subscribers' }) };
    }

    const subscribers = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        subscribers: Array.isArray(subscribers) ? subscribers : [],
        count: Array.isArray(subscribers) ? subscribers.length : 0
      })
    };
  } catch (error) {
    console.error('Error fetching newsletter subscribers:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
