import auth from './_auth.cjs';

const { requireSuperAdmin, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = requireSuperAdmin(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  try {
    const { businessId } = JSON.parse(event.body || '{}');
    if (!businessId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Archive business configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(String(businessId))}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          status: 'archived',
          deleted_at: new Date().toISOString()
        })
      }
    );

    const responseText = await response.text();
    if (!response.ok) {
      console.error('Archive business update failed:', response.status, responseText);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to archive business' }) };
    }

    let archivedBusinesses;
    try {
      archivedBusinesses = responseText ? JSON.parse(responseText) : [];
    } catch (parseError) {
      console.error('Archive business returned invalid database response:', parseError?.message || parseError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to archive business' }) };
    }

    if (!Array.isArray(archivedBusinesses) || archivedBusinesses.length !== 1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Business archived successfully' }) };
  } catch (error) {
    console.error('Unhandled archive business error:', error?.message || error);
    if (error instanceof SyntaxError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
