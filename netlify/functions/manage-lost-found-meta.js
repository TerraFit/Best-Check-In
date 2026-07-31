// netlify/functions/manage-lost-found-meta.js
// Add custom category or storage location for a business

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
    const action = body.action;
    const name = (body.name || '').trim();

    if (!businessId || !name || !action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId, action, and name required' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const table =
      action === 'add_category'
        ? 'lost_and_found_categories'
        : action === 'add_storage'
          ? 'lost_and_found_storage_locations'
          : null;

    if (!table) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([
        {
          business_id: businessId,
          name,
          is_builtin: false,
          sort_order: 500,
          active: true,
        },
      ]),
    });

    if (!res.ok) {
      const t = await res.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: t }) };
    }

    const row = (await res.json())[0];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        category: action === 'add_category' ? row : undefined,
        storage: action === 'add_storage' ? row : undefined,
      }),
    };
  } catch (error) {
    console.error('manage-lost-found-meta fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed' }),
    };
  }
};
