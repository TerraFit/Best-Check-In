const crypto = require('crypto');
const { authenticateHousekeepingServiceLive, resolveBusinessId } = require('./_housekeepingServiceAuth.cjs');

function decode(dataUrl) { const match = String(dataUrl || '').match(/^data:([A-Za-z0-9/+.-]+);base64,(.+)$/); return match ? { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') } : null; }
function ext(mime) { if (mime.includes('png')) return 'png'; if (mime.includes('webp')) return 'webp'; return 'jpg'; }

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    const gate = await authenticateHousekeepingServiceLive(event, 'execute');
    if (!gate.ok) return { statusCode: gate.status || 401, headers, body: JSON.stringify({ success: false, error: gate.error, code: gate.code }) };
    const body = JSON.parse(event.body || '{}');
    const scope = resolveBusinessId(gate.principal, body.businessId || null);
    if (!scope.ok) return { statusCode: scope.status, headers, body: JSON.stringify({ success: false, error: scope.error }) };
    const decoded = decode(body.image);
    if (!decoded) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'A base64 image is required' }) };
    if (decoded.buffer.length > 4 * 1024 * 1024) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Photo must be under 4MB after compression' }) };
    const supabaseUrl = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    const now = new Date(); const path = `${scope.businessId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2,'0')}/${crypto.randomUUID()}.${ext(decoded.mimeType)}`;
    const upload = await fetch(`${supabaseUrl}/storage/v1/object/housekeeping-issue-photos/${path}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': decoded.mimeType, 'x-upsert': 'true' }, body: decoded.buffer });
    if (!upload.ok) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to upload issue photo', details: await upload.text() }) };
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, url: `${supabaseUrl}/storage/v1/object/public/housekeeping-issue-photos/${path}` }) };
  } catch (error) { console.error('upload-housekeeping-issue-photo fatal:', error); return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message || 'Upload failed' }) }; }
};
