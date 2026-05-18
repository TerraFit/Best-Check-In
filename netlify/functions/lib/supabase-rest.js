// ============================================================
// CENTRALIZED SUPABASE REST CLIENT
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const getHeaders = (additionalHeaders = {}) => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  ...additionalHeaders
});

// ============================================================
// READ OPERATIONS
// ============================================================

export async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(options.headers),
    ...options
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase REST error ${response.status}: ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

// ============================================================
// WRITE OPERATIONS
// ============================================================

export async function supabaseInsert(table, data, returnData = true) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const payload = Array.isArray(data) ? data : [data];
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(returnData ? { 'Prefer': 'return=representation' } : {}),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase insert error ${response.status}: ${error}`);
  }

  if (returnData) {
    const result = await response.json();
    return result;
  }
  return { success: true };
}

export async function supabaseUpdate(table, id, data, idColumn = 'id') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${idColumn}=eq.${id}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: getHeaders({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase update error ${response.status}: ${error}`);
  }

  const result = await response.json();
  return result[0];
}

export async function supabaseDelete(table, id, idColumn = 'id') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${idColumn}=eq.${id}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase delete error ${response.status}: ${error}`);
  }

  return { success: true };
}

// ============================================================
// STANDARDIZED RESPONSES
// ============================================================

export const successResponse = (data, message = null) => ({
  success: true,
  data,
  ...(message && { message })
});

export const errorResponse = (error, statusCode = 500, details = null) => ({
  success: false,
  error,
  ...(details && { details }),
  statusCode
});

export const createHandlerResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  },
  body: JSON.stringify(body)
});

// ============================================================
// CENTRALIZED JWT VERIFICATION
// ============================================================

export function verifyBusinessAuth(authHeader) {
  const jwt = require('jsonwebtoken');
  
  if (!authHeader) {
    throw new Error('No authorization token provided');
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    throw new Error('Invalid token format');
  }

  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    if (!decoded.user_metadata?.business_id) {
      throw new Error('Token missing business ID');
    }
    return {
      businessId: decoded.user_metadata.business_id,
      email: decoded.user_metadata.email,
      name: decoded.user_metadata.business_name,
      userId: decoded.sub
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token signature');
    }
    throw error;
  }
}
