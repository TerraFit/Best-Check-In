import crypto from 'node:crypto';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function findRequest(url, key, token, requestId) {
  const hash = hashToken(token);
  const response = await fetch(`${url}/rest/v1/business_application_review_requests?id=eq.${encodeURIComponent(requestId)}&response_token_hash=eq.${hash}&response_token_expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,business_id,request_type,document_key,message,status,applicant_response,requested_at&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) throw new Error('Review request lookup failed');
  const rows = await response.json();
  return rows?.[0] || null;
}

export const handler = async (event) => {
  const method = String(event.httpMethod || 'GET').toUpperCase();
  if (method === 'OPTIONS') return reply(204, {});
  if (!['GET', 'POST'].includes(method)) return reply(405, { error: 'Method not allowed' });
  try {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return reply(500, { error: 'Service unavailable' });
    const body = method === 'POST' ? JSON.parse(event.body || '{}') : (event.queryStringParameters || {});
    const token = body.token;
    const requestId = body.requestId || body.request;
    if (typeof token !== 'string' || token.length < 32 || token.length > 128 || typeof requestId !== 'string') return reply(400, { error: 'A valid secure review link is required' });
    const request = await findRequest(url, key, token, requestId);
    if (!request) return reply(404, { error: 'This review link is invalid or has expired' });

    if (method === 'GET') {
      return reply(200, {
        success: true,
        request: {
          id: request.id,
          type: request.request_type,
          documentKey: request.document_key,
          message: request.message,
          status: request.status,
          applicantResponse: request.applicant_response,
          requestedAt: request.requested_at
        }
      });
    }

    if (request.status !== 'awaiting_applicant') return reply(409, { error: 'This review request has already been answered or closed' });
    const responseText = typeof body.response === 'string' ? body.response.trim() : '';
    const file = body.file && typeof body.file === 'object' ? body.file : null;
    if (!responseText && !file) return reply(400, { error: 'Please provide a response or upload the requested document' });
    if (request.request_type === 'document_replacement' && !file) return reply(400, { error: 'Please upload the requested replacement document' });

    let documentRow = null;
    if (file) {
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
      if (!allowed.has(file.contentType) || typeof file.base64 !== 'string' || file.base64.length > 5.6 * 1024 * 1024) return reply(400, { error: 'Use a JPG, PNG, WebP or PDF file up to 4 MB' });
      const bytes = Buffer.from(file.base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) return reply(400, { error: 'The document must be 4 MB or smaller' });
      const safeName = String(file.filename || 'replacement-document').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      const path = `${request.business_id}/${request.id}/${crypto.randomUUID()}-${safeName}`;
      const upload = await fetch(`${url}/storage/v1/object/business-application-documents/${path.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': file.contentType, 'x-upsert': 'false' },
        body: bytes
      });
      if (!upload.ok) {
        console.error('[business-application-review] Storage upload failed:', await upload.text());
        return reply(502, { error: 'Could not upload the document. Please try again.' });
      }
      const docResponse = await fetch(`${url}/rest/v1/business_application_documents`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify([{ business_id: request.business_id, review_request_id: request.id, document_key: request.document_key || 'additional_document', storage_path: path, original_filename: safeName, content_type: file.contentType, uploaded_by: 'applicant' }])
      });
      if (!docResponse.ok) {
        console.error('[business-application-review] Document record insert failed:', await docResponse.text());
        return reply(500, { error: 'The document was uploaded but could not be attached to the application. Please contact support.' });
      }
      const docs = await docResponse.json();
      documentRow = docs?.[0] || null;
    }

    const update = await fetch(`${url}/rest/v1/business_application_review_requests?id=eq.${encodeURIComponent(request.id)}&status=eq.awaiting_applicant`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ applicant_response: responseText || (file ? 'Replacement document uploaded.' : ''), status: 'responded', responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    });
    if (!update.ok) throw new Error('Could not save applicant response');
    const updated = await update.json();
    if (!Array.isArray(updated) || updated.length !== 1) return reply(409, { error: 'This review request has already been answered' });
    return reply(200, { success: true, message: 'Your response has been sent to the FastCheckIn review team.', documentUploaded: Boolean(documentRow) });
  } catch (error) {
    console.error('[business-application-review] Error:', error?.message || error);
    return reply(500, { error: 'Could not process your application response' });
  }
};
