// Upload Lost & Found photo into the tenant's storage namespace.
import auth from './_auth.cjs';
import crypto from 'node:crypto';

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function decodeBase64Image(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return null;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) return null;
  return { mimeType, buffer };
}
function extensionForMime(mimeType) { return mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : mimeType === 'image/gif' ? 'gif' : 'jpg'; }

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers);
  if (!requireBusinessPermission(actor.principal, 'canEditLostFound')) return authFailure({ status: 403, error: 'Missing permission: canEditLostFound' }, headers);

  try {
    let body; try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }
    const tenant = resolveTenant(actor.principal, body.businessId || body.business_id); if (!tenant.ok) return authFailure(tenant, headers);
    const images = Array.isArray(body.images) ? body.images : body.image ? [body.image] : [];
    if (!images.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId and at least one image required' }) };
    if (images.length > 8) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Maximum 8 photos per upload' }) };
    const supabaseUrl = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    const tag = String(body.tagNumber || body.tag_number || 'pending').trim();
    const itemId = body.itemId || body.item_id || null;
    if (!tag) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid tag number' }) };

    // For existing items, require the item UUID and tenant-scoped tag to agree. This prevents
    // a caller from choosing another tenant's tag/path or using an arbitrary storage namespace.
    let item = null;
    if (tag.toLowerCase() !== 'pending' || itemId) {
      if (!itemId && tag.toLowerCase() !== 'pending') {
        const itemRes = await fetch(`${supabaseUrl}/rest/v1/lost_and_found?business_id=eq.${encodeURIComponent(tenant.businessId)}&tag_number=eq.${encodeURIComponent(tag)}&select=id,tag_number&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
        if (!itemRes.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to validate Lost & Found item' }) };
        const rows = await itemRes.json(); if (!rows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Lost & Found item not found' }) };
        item = rows[0];
      } else {
        const itemRes = await fetch(`${supabaseUrl}/rest/v1/lost_and_found?id=eq.${encodeURIComponent(itemId)}&business_id=eq.${encodeURIComponent(tenant.businessId)}&select=id,tag_number&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
        if (!itemRes.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to validate Lost & Found item' }) };
        const rows = await itemRes.json(); if (!rows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Lost & Found item not found' }) };
        item = rows[0];
        if (tag.toLowerCase() !== 'pending' && item.tag_number !== tag && item.tag_number !== `${tag.replace(/-sig$/i, '')}`) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Upload tag does not match Lost & Found item' }) };
        }
      }
    }

    const now = new Date();
    const safeTag = tag.replace(/[^a-zA-Z0-9_-]/g, '_');
    const urls = [];
    for (const image of images) {
      const decoded = decodeBase64Image(image);
      if (!decoded) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Only JPEG, PNG, WebP, and GIF images are supported' }) };
      if (decoded.buffer.length > MAX_PHOTO_BYTES) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Each photo must be under 4MB after compression' }) };
      const path = `${tenant.businessId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${safeTag}/${crypto.randomUUID()}.${extensionForMime(decoded.mimeType)}`;
      const response = await fetch(`${supabaseUrl}/storage/v1/object/lost-found-photos/${path}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': decoded.mimeType, 'x-upsert': 'false' }, body: decoded.buffer });
      if (!response.ok) { console.error('upload-lost-found-photo storage upload failed:', response.status); return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to upload photo' }) }; }
      urls.push(`${supabaseUrl}/storage/v1/object/public/lost-found-photos/${path}`);
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, urls }) };
  } catch (error) { console.error('upload-lost-found-photo fatal:', error); return { statusCode: 500, headers, body: JSON.stringify({ error: 'Upload failed' }) }; }
};
