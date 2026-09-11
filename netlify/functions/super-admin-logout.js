exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // Expire the hardened SuperAdmin session cookie immediately.
    'Set-Cookie': 'fastcheckin_super_admin=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict; Secure;'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  // Logout is intentionally idempotent. Clearing the browser cookie is the
  // server-side invalidation mechanism available for the stateless JWT.
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
};
