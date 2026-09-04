const { createClient } = require('@Supabase/supabase-js');
const auth = require('./_auth.cjs');

const { authenticateRequest, requirePlatformPermission, authFailure } = auth;

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  const principal = authentication.principal;
  if (!requirePlatformPermission(principal, 'platform:businesses:write')) {
    return authFailure({ status: 403, error: 'Missing permission: platform:businesses:write' }, headers);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Delete business configuration is incomplete');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { businessId } = JSON.parse(event.body || '{}');
    if (!businessId || typeof businessId !== 'string' || businessId.length > 200) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
    }

    const { error: deleteError } = await supabase.from('businesses').delete().eq('id', businessId);
    if (deleteError) {
      console.error('Delete error:', deleteError?.message || deleteError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete business' }) };
    }

    await supabase.from('email_verifications').delete().eq('business_id', businessId);
    await supabase.from('setup_tokens').delete().eq('business_id', businessId);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Business permanently deleted' }) };
  } catch (error) {
    console.error('Unhandled delete business error:', error?.message || error);
    if (error instanceof SyntaxError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
