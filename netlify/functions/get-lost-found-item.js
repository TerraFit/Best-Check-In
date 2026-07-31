// netlify/functions/get-lost-found-item.js
// Single item + activity timeline

function assertPermission(event) {
  const authHeader =
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (!authHeader) {
    return { ok: true };
  }
  try {
    const jwt = require('jsonwebtoken');
    const token = authHeader.replace('Bearer ', '').trim();
    jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    return { ok: true };
  } catch (e) {
    return { ok: true };
  }
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    assertPermission(event);
    const q = event.queryStringParameters || {};
    const { businessId, itemId } = q;
    if (!businessId || !itemId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId and itemId required' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const sh = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };

    const itemRes = await fetch(
      `${supabaseUrl}/rest/v1/lost_and_found?id=eq.${itemId}&business_id=eq.${businessId}&select=*`,
      { headers: sh }
    );
    if (!itemRes.ok) {
      const t = await itemRes.text();
      return { statusCode: itemRes.status, headers, body: JSON.stringify({ error: t }) };
    }
    const rows = await itemRes.json();
    if (!rows.length) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Item not found' }) };
    }

    const actRes = await fetch(
      `${supabaseUrl}/rest/v1/lost_and_found_activity?item_id=eq.${itemId}&business_id=eq.${businessId}&select=*&order=created_at.desc`,
      { headers: sh }
    );
    const activity = actRes.ok ? await actRes.json() : [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, item: rows[0], activity }),
    };
  } catch (error) {
    console.error('get-lost-found-item fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to fetch item' }),
    };
  }
};
