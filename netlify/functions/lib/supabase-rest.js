// netlify/functions/lib/supabase-rest.js
// ✅ CORRECT: CommonJS version

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

async function supabaseFetch(path, options = {}) {
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

async function supabaseInsert(table, data, returnData = true) {
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

async function supabaseUpdate(table, id, data, idColumn = 'id') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${idColumn}=eq.${encodeURIComponent(id)}`;
  
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

async function supabaseDelete(table, id, idColumn = 'id') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${idColumn}=eq.${encodeURIComponent(id)}`;
  
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
// RPC OPERATIONS
// ============================================================

async function supabaseRpc(functionName, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders({
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }),
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase RPC error ${response.status}: ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

// ============================================================
// STANDARDIZED RESPONSES
// ============================================================

function successResponse(data, message = null) {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}

function errorResponse(error, statusCode = 500, details = null) {
  return {
    success: false,
    error,
    ...(details && { details }),
    statusCode
  };
}

function createHandlerResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  supabaseFetch,
  supabaseInsert,
  supabaseUpdate,
  supabaseDelete,
  supabaseRpc,
  successResponse,
  errorResponse,
  createHandlerResponse,
  // For backward compatibility with existing code
  getHeaders
};
