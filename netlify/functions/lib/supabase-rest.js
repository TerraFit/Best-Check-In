// ============================================================
// CENTRALIZED SUPABASE REST CLIENT
// ============================================================

import auth from '../_auth.cjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const getHeaders = (additionalHeaders = {}) => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  ...additionalHeaders
});

export async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const response = await fetch(url, { method: 'GET', headers: getHeaders(options.headers), ...options });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase REST error ${response.status}: ${error}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

export async function supabaseInsert(table, data, returnData = true) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const payload = Array.isArray(data) ? data : [data];
  const response = await fetch(url, { method: 'POST', headers: getHeaders(returnData ? { 'Prefer': 'return=representation' } : {}), body: JSON.stringify(payload) });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase insert error ${response.status}: ${error}`);
  }
  if (returnData) return await response.json();
  return { success: true };
}

export async function supabaseUpdate(table, id, data, idColumn = 'id') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${idColumn}=eq.${id}`;
  const response = await fetch(url, { method: 'PATCH', headers: getHeaders({ 'Prefer': 'return=representation' }), body: JSON.stringify(data) });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase update error ${response.status}: ${error}`);
  }
  const result = await response.json();
  return result[0];
}

export async function supabaseDelete(table, id, idColumn = 'id') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${idColumn}=eq.${id}`;
  const response = await fetch(url, { method: 'DELETE', headers: getHeaders() });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase delete error ${response.status}: ${error}`);
  }
  return { success: true };
}

export const successResponse = (data, message = null) => ({ success: true, data, ...(message && { message }) });
export const errorResponse = (error, statusCode = 500, details = null) => ({ success: false, error, ...(details && { details }), statusCode });
export const createHandlerResponse = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' }, body: JSON.stringify(body) });

// Legacy compatibility helper. Authentication is now delegated to _auth.cjs;
// this helper is intentionally limited to authenticated business principals.
export function verifyBusinessAuth(authHeader) {
  const token = String(authHeader || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const verified = auth.verifyToken(token);
  if (!verified.ok) throw new Error(verified.error || 'Authentication failed');
  const principal = auth.principalFromDecoded(verified.decoded);
  if (!principal || !['business', 'employee'].includes(principal.actorType) || !principal.businessId) {
    throw new Error('Business account access required');
  }
  if (principal.active === false) throw new Error('Account is inactive');
  return {
    businessId: principal.businessId,
    email: principal.email,
    name: principal.role,
    userId: principal.userId,
  };
}
