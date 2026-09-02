import auth from './_auth.cjs';
import rbac from './_rbac.cjs';

const { authenticateRequest, resolveTenant, requireBusinessPermission, requirePlatformPermission, authFailure } = auth;
const { requirePermission } = rbac;
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const authResult = authenticateRequest(event);
  if (!authResult.ok) return authFailure(authResult, headers);

  const principal = authResult.principal;
  const requestedBusinessId = event.queryStringParameters?.businessId || null;
  const isPlatformActor = ['super_admin', 'platform'].includes(principal.actorType);

  if (isPlatformActor) {
    if (!requirePlatformPermission(principal, 'platform:audit:read')) {
      return authFailure({ status: 403, error: 'Missing permission: platform:audit:read' }, headers);
    }
  } else {
    if (!['business', 'employee'].includes(principal.actorType)) {
      return authFailure({ status: 403, error: 'Business account access required' }, headers);
    }
    if (!requireBusinessPermission(principal, 'canViewAuditLog') && !requirePermission(principal, 'canViewAuditLog')) {
      return authFailure({ status: 403, error: 'Missing permission: canViewAuditLog' }, headers);
    }
  }

  const tenant = resolveTenant(principal, requestedBusinessId);
  if (!tenant.ok) return authFailure(tenant, headers);
  const businessId = tenant.businessId;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  try {
    const { limit = 50, offset = 0 } = event.queryStringParameters || {};
    const response = await fetch(
      `${supabaseUrl}/rest/v1/audit_logs?business_id=eq.${encodeURIComponent(businessId)}&select=*&order=created_at.desc&limit=${parseInt(limit)}&offset=${parseInt(offset)}`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Supabase error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch audit logs' }) };
    }

    const data = await response.json();
    const mappedData = data.map((log) => ({
      id: log.id,
      business_id: log.business_id,
      user_id: log.user_id,
      user_name: log.user_name || 'Unknown User',
      action: log.action,
      details: log.details || {},
      description: log.description || log.action,
      booking_id: log.booking_id,
      guest_name: log.guest_name || log.details?.guest_name || 'Unknown Guest',
      ip_address: log.ip_address || 'unknown',
      user_agent: log.user_agent || 'unknown',
      created_at: log.created_at,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: mappedData,
        total: mappedData.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }),
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch audit logs',
      }),
    };
  }
};
