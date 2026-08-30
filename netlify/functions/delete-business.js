const { createClient } = require('@supabase/supabase-js');
const { requireSuperAdmin, authFailure } = require('./_superAdminAuth.cjs');

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = requireSuperAdmin(event);
  if (!auth.ok) return authFailure(auth, headers);

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const { businessId } = JSON.parse(event.body || '{}');
    if (!businessId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };

    const { error: deleteError } = await supabase.from('businesses').delete().eq('id', businessId);
    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete business' }) };
    }

    await supabase.from('email_verifications').delete().eq('business_id', businessId);
    await supabase.from('setup_tokens').delete().eq('business_id', businessId);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Business permanently deleted' }) };
  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
