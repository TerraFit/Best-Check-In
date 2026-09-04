import auth from './_auth.cjs';
import { supabaseFetch } from './lib/supabase-rest.js';

const { authenticateRequest, requirePlatformPermission, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed', data: [] }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  const principal = authentication.principal;
  if (!requirePlatformPermission(principal, 'platform:change_requests:read')) {
    return authFailure({ status: 403, error: 'Missing permission: platform:change_requests:read' }, headers);
  }

  try {
    const { status, businessId } = event.queryStringParameters || {};
    let query = 'change_requests?select=*&order=created_at.desc';
    if (status) query += `&status=eq.${encodeURIComponent(status)}`;
    if (businessId) query += `&business_id=eq.${encodeURIComponent(businessId)}`;
    const data = await supabaseFetch(query);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data || [], count: data?.length || 0 }) };
  } catch (error) {
    console.error('Change requests lookup failed:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error', data: [] }) };
  }
};
