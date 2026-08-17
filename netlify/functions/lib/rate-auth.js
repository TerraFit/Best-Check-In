// netlify/functions/lib/rate-auth.js
// Shared auth + response helpers for rate management Netlify functions.
// Authenticated business_id from JWT is authoritative.

const jwt = require('jsonwebtoken');

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
};

function json(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

function optionsResponse() {
  return { statusCode: 204, headers: CORS, body: '' };
}

/**
 * Verify JWT and extract businessId.
 * Returns { businessId, decoded } or a ready-to-return error response object.
 */
function requireBusinessAuth(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return { error: json(401, { error: 'No authorization token provided' }) };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { error: json(401, { error: 'Invalid token format' }) };
  }
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    const businessId = decoded.user_metadata && decoded.user_metadata.business_id;
    if (!businessId) {
      return { error: json(403, { error: 'Token missing business ID' }) };
    }
    return { businessId, decoded };
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return { error: json(401, { error: 'Token has expired' }) };
    }
    return { error: json(401, { error: 'Invalid token: ' + (e.message || 'verification failed') }) };
  }
}

function supabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return { supabaseUrl, supabaseKey };
}

function restHeaders(supabaseKey, extra = {}) {
  return {
    apikey: supabaseKey,
    Authorization: 'Bearer ' + supabaseKey,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Map common PostgREST errors to domain-friendly messages. */
function mapDbError(status, text) {
  const t = String(text || '');
  if (/duplicate|unique/i.test(t)) {
    return { status: 409, error: 'Conflict: a matching record already exists' };
  }
  if (/foreign key|violates foreign/i.test(t)) {
    return { status: 400, error: 'Referenced record not found or not accessible' };
  }
  if (/cross-business|rate_mgmt/i.test(t)) {
    return { status: 400, error: 'Cross-business reference rejected' };
  }
  if (/check constraint|violates check/i.test(t)) {
    return { status: 400, error: 'Validation failed: data does not satisfy constraints' };
  }
  return { status: status >= 400 && status < 600 ? status : 500, error: 'Database operation failed' };
}

module.exports = {
  CORS,
  json,
  optionsResponse,
  requireBusinessAuth,
  supabaseConfig,
  restHeaders,
  mapDbError,
};
