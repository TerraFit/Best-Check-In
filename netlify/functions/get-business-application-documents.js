import superAdminAuth from './_superAdminAuth.cjs';

const { requireSuperAdmin, authFailure } = superAdminAuth;
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

class SupabaseRequestError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function readSupabaseJson(response, label) {
  const raw = await response.text();
  if (!response.ok) {
    throw new SupabaseRequestError(
      `${label} failed (HTTP ${response.status})`,
      response.status,
      raw
    );
  }
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function isMissingReviewSchema(error) {
  const details = String(error?.details || '');
  return error?.status === 404 ||
    details.includes('PGRST205') ||
    details.includes('42P01') ||
    details.includes('business_application_documents') ||
    details.includes('business_application_review_requests');
}

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
    if (!url || !key) {
      console.error('[get-business-application-documents] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
      return reply(500, { error: 'Server configuration error' });
    }

    const authHeaders = { apikey: key, Authorization: `Bearer ${key}` };
    const documentsResponse = await fetch(
      `${url}/rest/v1/business_application_documents?business_id=eq.${encodeURIComponent(businessId)}&select=id,review_request_id,document_key,storage_path,original_filename,content_type,created_at&order=created_at.desc`,
      { headers: authHeaders }
    );
    const documents = await readSupabaseJson(documentsResponse, 'Application document query');

    const signed = await Promise.all((documents || []).map(async (document) => {
      if (!document.storage_path) {
        console.error('[get-business-application-documents] Document has no storage_path:', document.id);
        return { ...document, signedUrl: null };
      }
      const path = document.storage_path.split('/').map(encodeURIComponent).join('/');
      const signResponse = await fetch(
        `${url}/storage/v1/object/sign/business-application-documents/${path}`,
        {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: 600 })
        }
      );
      if (!signResponse.ok) {
        console.error('[get-business-application-documents] Signed URL failed:', {
          status: signResponse.status,
          documentId: document.id,
          details: await signResponse.text()
        });
        return { ...document, signedUrl: null };
      }
      const data = await signResponse.json();
      const signedPath = data.signedURL || data.signedUrl || null;
      return {
        ...document,
        signedUrl: signedPath
          ? (signedPath.startsWith('http')
              ? signedPath
              : `${url}/storage/v1${signedPath.startsWith('/') ? '' : '/'}${signedPath}`)
          : null
      };
    }));

    const reviewResponse = await fetch(
      `${url}/rest/v1/business_application_review_requests?business_id=eq.${encodeURIComponent(businessId)}&select=id,request_type,document_key,message,status,applicant_response,requested_at,responded_at&order=requested_at.desc`,
      { headers: authHeaders }
    );
    const reviewRequests = await readSupabaseJson(reviewResponse, 'Application review history query');

    return reply(200, { success: true, documents: signed, reviewRequests });
  } catch (error) {
    console.error('[get-business-application-documents] Error:', {
      message: error?.message || String(error),
      status: error?.status || null,
      details: error?.details || null
    });

    if (isMissingReviewSchema(error)) {
      return reply(503, {
        success: false,
        code: 'APPLICATION_REVIEW_SCHEMA_NOT_READY',
        error: 'Application document storage has not been initialized. Apply the registration review workflow database migration, then retry.'
      });
    }
    return reply(500, { success: false, error: 'Could not load application documents' });
  }
};
