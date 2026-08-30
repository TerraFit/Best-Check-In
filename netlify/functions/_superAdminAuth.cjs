const jwt = require('jsonwebtoken');

function getHeader(event, name) {
  const headers = event?.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

function getToken(event) {
  const authorization = getHeader(event, 'authorization');
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }

  const cookieHeader = getHeader(event, 'cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(cookieHeader.split(';').map(part => {
      const index = part.indexOf('=');
      if (index === -1) return [part.trim(), ''];
      return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
    }));
    if (cookies.fastcheckin_super_admin) return cookies.fastcheckin_super_admin;
  }

  return null;
}

function requireSuperAdmin(event) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return { ok: false, status: 500, error: 'Server authentication is not configured' };

  const token = getToken(event);
  if (!token) return { ok: false, status: 401, error: 'Authentication required' };

  try {
    const decoded = jwt.verify(token, secret);
    const metadata = decoded?.user_metadata || {};
    const isSuperAdmin = decoded?.role === 'super_admin' || metadata.super_admin === true || metadata.super_admin === 'true';
    if (!isSuperAdmin) return { ok: false, status: 403, error: 'SuperAdmin access required' };
    return { ok: true, principal: { actorType: 'super_admin', role: 'super_admin', email: decoded.email || metadata.email || null } };
  } catch {
    return { ok: false, status: 401, error: 'Invalid or expired authentication token' };
  }
}

function authFailure(result, headers) {
  return {
    statusCode: result.status,
    headers,
    body: JSON.stringify({ success: false, error: result.error })
  };
}

module.exports = { requireSuperAdmin, authFailure };
