// netlify/functions/get-business-settings.js
import auth from './_auth.cjs';

const { requireBusinessActor, resolveTenant, requireBusinessPermission, authFailure } = auth;

// Keep this projection private and tenant-scoped. Do not add these fields to the
// public get-business-branding endpoint.
const PROFILE_FIELDS = [
  'id', 'registered_name', 'legal_name', 'trading_name', 'slogan',
  'email', 'secondary_email', 'phone', 'mobile_phone', 'secondary_phone', 'website',
  'total_rooms', 'establishment_type', 'tgsa_grading', 'max_rooms',
  'logo_url', 'hero_image_url', 'physical_address', 'postal_address',
  'marketing_consent_enabled', 'directors', 'updated_at'
];

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = requireBusinessActor(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  if (!requireBusinessPermission(authentication.principal, 'canManageSettings')) {
    return authFailure({ status: 403, error: 'Missing permission: canManageSettings' }, headers);
  }

  const { businessId } = event.queryStringParameters || {};
  const tenant = resolveTenant(authentication.principal, businessId);
  if (!tenant.ok) return authFailure(tenant, headers);

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('get-business-settings: missing Supabase configuration');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const params = new URLSearchParams({
      id: `eq.${tenant.businessId}`,
      select: PROFILE_FIELDS.join(','),
      limit: '1'
    });

    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?${params.toString()}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
        Prefer: 'count=exact'
      }
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error('get-business-settings: Supabase REST error:', response.status, responseText);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Business profile could not be loaded' }) };
    }

    let rows;
    try {
      rows = responseText ? JSON.parse(responseText) : [];
    } catch (parseError) {
      console.error('get-business-settings: invalid Supabase response:', parseError?.message || parseError);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Invalid business profile response' }) };
    }

    const data = Array.isArray(rows) ? rows[0] : null;
    if (!data) {
      console.error('get-business-settings: business not found:', tenant.businessId);
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (error) {
    console.error('Error fetching business settings:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch settings' }) };
  }
};
