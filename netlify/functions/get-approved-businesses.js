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

  if (!requirePlatformPermission(principal, 'platform:businesses:read')) {
    return authFailure({ status: 403, error: 'Missing permission: platform:businesses:read' }, headers);
  }

  try {
    const data = await supabaseFetch('businesses?status=eq.approved&select=id,registered_name,trading_name,legal_name,registration_number,business_number,vat_number,establishment_type,tgsa_grading,phone,email,physical_address,postal_address,subscription_tier,payment_status,last_payment_date,payment_due_date,created_at,status,service_paused,slogan,total_rooms,avg_price,logo_url,hero_image_url&order=created_at.desc&limit=50');
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data || [], count: data?.length || 0 }) };
  } catch (error) {
    console.error('Approved businesses lookup failed:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error', data: [] }) };
  }
};
