// netlify/functions/upload-lost-found-photo.js
// Accepts base64 image(s), compresses are client-side; stores in
// lost-found-photos/{businessId}/{yyyy}/{mm}/{tagOrPending}/{uuid}.jpg

const crypto = require('crypto');

function decodeBase64Image(dataUrl) {
  const matches = String(dataUrl || '').match(/^data:([A-Za-z0-9/+.-]+);base64,(.+)$/);
  if (!matches) return null;
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64'),
  };
}

function extFromMime(mime) {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const businessId = body.businessId || body.business_id;
    const tagNumber = body.tagNumber || body.tag_number || 'pending';
    const images = Array.isArray(body.images)
      ? body.images
      : body.image
        ? [body.image]
        : [];

    if (!businessId || !images.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId and at least one image required' }),
      };
    }

    if (images.length > 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Maximum 8 photos per upload' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const safeTag = String(tagNumber).replace(/[^a-zA-Z0-9_-]/g, '_');

    const urls = [];

    for (const img of images) {
      const decoded = decodeBase64Image(img);
      if (!decoded) continue;

      // Reject oversized payloads (>4MB raw)
      if (decoded.buffer.length > 4 * 1024 * 1024) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Each photo must be under 4MB after compression' }),
        };
      }

      const ext = extFromMime(decoded.mimeType);
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const path = `${businessId}/${yyyy}/${mm}/${safeTag}/${fileName}`;

      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/lost-found-photos/${path}`,
        {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': decoded.mimeType,
            'x-upsert': 'true',
          },
          body: decoded.buffer,
        }
      );

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error('storage upload failed', errText);
        // Fallback: if bucket missing, return data URL is not ideal — fail clearly
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error:
              'Failed to upload photo. Ensure Supabase bucket "lost-found-photos" exists and is public (or use signed URLs).',
            details: errText,
          }),
        };
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/lost-found-photos/${path}`;
      urls.push(publicUrl);
    }

    if (!urls.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid images provided' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, urls }),
    };
  } catch (error) {
    console.error('upload-lost-found-photo fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Upload failed' }),
    };
  }
};
