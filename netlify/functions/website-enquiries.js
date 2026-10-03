import auth from './_auth.cjs';
import { supabaseFetch, supabaseUpdate } from './lib/supabase-rest.js';

const { authenticateRequest, requirePlatformPermission, authFailure } = auth;
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS'
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  if (!requirePlatformPermission(authentication.principal, 'platform:website_enquiries:read')) {
    return authFailure({ status: 403, error: 'Missing permission: platform:website_enquiries:read' }, headers);
  }

  try {
    if (event.httpMethod === 'GET') {
      const data = await supabaseFetch('website_enquiries?select=*&order=created_at.desc');
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data || [] }) };
    }

    if (event.httpMethod === 'PATCH') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON body' }) }; }
      const id = String(body.id || '').trim();
      const status = String(body.status || '').trim();
      if (!id || !['new', 'contacted', 'closed'].includes(status)) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid enquiry or status' }) };
      }
      const data = await supabaseUpdate('website_enquiries', id, {
        status,
        updated_at: new Date().toISOString()
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  } catch (error) {
    console.error('Website enquiries lookup/update failed:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
