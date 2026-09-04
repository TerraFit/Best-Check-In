import auth from './_auth.cjs';
import { createClient } from '@supabase/supabase-js';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);

  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) {
      return authFailure({ status: 403, error: 'Missing permission: platform:businesses:read' }, headers);
    }
  } else if (!requireBusinessPermission(principal, 'canManageStaff')) {
    return authFailure({ status: 403, error: 'Missing permission: canManageStaff' }, headers);
  }

  try {
    const requestedBusinessId = typeof event.queryStringParameters?.businessId === 'string'
      ? event.queryStringParameters.businessId.trim()
      : '';
    if (!requestedBusinessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
    }

    const businessId = resolveTenant(principal, requestedBusinessId);
    if (!businessId) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Business directors configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from('directors')
      .select('name, id_number, id_photo_url')
      .eq('business_id', businessId);

    if (error) {
      console.error('Business directors lookup failed:', error?.message || error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch business directors' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data || []) };
  } catch (error) {
    console.error('Unhandled business directors error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
