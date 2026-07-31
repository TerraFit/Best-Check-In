// netlify/functions/get-lost-found-meta.js
// Categories + storage locations (builtin + business custom)

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
    const businessId = (event.queryStringParameters || {}).businessId;
    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const sh = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };

    const [catRes, storRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/lost_and_found_categories?or=(business_id.is.null,business_id.eq.${businessId})&active=eq.true&select=*&order=sort_order.asc`,
        { headers: sh }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/lost_and_found_storage_locations?or=(business_id.is.null,business_id.eq.${businessId})&active=eq.true&select=*&order=sort_order.asc`,
        { headers: sh }
      ),
    ]);

    const categories = catRes.ok ? await catRes.json() : [];
    const storageLocations = storRes.ok ? await storRes.json() : [];

    // Fallback builtins if tables empty / migration not applied
    const fallbackCats = [
      'Clothing', 'Electronics', 'Jewellery', 'Documents', 'Wallets', 'Keys',
      'Chargers', 'Toiletries', 'Toys', 'Books', 'Sports Equipment',
      'Medical Devices', 'Miscellaneous',
    ].map((name, i) => ({
      id: `builtin-cat-${i}`,
      name,
      is_builtin: true,
      sort_order: (i + 1) * 10,
      active: true,
    }));

    const fallbackStor = ['Shelf', 'Cupboard', 'Safe', 'Cabinet', 'Box Number'].map(
      (name, i) => ({
        id: `builtin-stor-${i}`,
        name,
        is_builtin: true,
        sort_order: (i + 1) * 10,
        active: true,
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        categories: categories.length ? categories : fallbackCats,
        storageLocations: storageLocations.length ? storageLocations : fallbackStor,
      }),
    };
  } catch (error) {
    console.error('get-lost-found-meta fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to load meta' }),
    };
  }
};
