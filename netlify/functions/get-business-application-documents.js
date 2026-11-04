import superAdminAuth from './_superAdminAuth.cjs';

const { requireSuperAdmin, authFailure } = superAdminAuth;
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, {});
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Method not allowed' });
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return authFailure(auth, headers);
  try {
    const businessId = event.queryStringParameters?.businessId;
    if (!businessId) return reply(400, { error: 'Business ID is required' });
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return reply(500, { error: 'Server configuration error' });
    const response = await fetch(`${url}/rest/v1/business_application_documents?business_id=eq.${encodeURIComponent(businessId)}&select=id,review_request_id,document_key,storage_path,original_filename,content_type,created_at&order=created_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!response.ok) throw new Error('Could not load application documents');
    const documents = await response.json();
    const signed = await Promise.all((documents || []).map(async (document) => {
      const path = document.storage_path.split('/').map(encodeURIComponent).join('/');
      const signResponse = await fetch(`${url}/storage/v1/object/sign/business-application-documents/${path}`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 600 })
      });
      if (!signResponse.ok) {
        console.error('[get-business-application-documents] Signed URL failed:', await signResponse.text());
        return { ...document, signedUrl: null };
      }
      const data = await signResponse.json();
      const signedPath = data.signedURL || data.signedUrl || null;
      return { ...document, signedUrl: signedPath ? (signedPath.startsWith('http') ? signedPath : `${url}/storage/v1${signedPath.startsWith('/') ? '' : '/'}${signedPath}`) : null };
    }));
    return reply(200, { success: true, documents: signed });
  } catch (error) {
    console.error('[get-business-application-documents] Error:', error?.message || error);
    return reply(500, { error: 'Could not load application documents' });
  }
};
