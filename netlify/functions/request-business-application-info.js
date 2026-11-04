import crypto from 'node:crypto';
import { Resend } from 'resend';
import superAdminAuth from './_superAdminAuth.cjs';

const { requireSuperAdmin, authFailure } = superAdminAuth;
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return authFailure(auth, headers);

  try {
    const { businessId, requestType, documentKey = null, message } = JSON.parse(event.body || '{}');
    if (!businessId || !['clarification', 'document_replacement', 'additional_information'].includes(requestType) || typeof message !== 'string' || message.trim().length < 5 || message.length > 4000) {
      return reply(400, { error: 'Business, request type and a clear message are required.' });
    }
    if (requestType === 'document_replacement' && (typeof documentKey !== 'string' || !documentKey.trim())) {
      return reply(400, { error: 'Specify which document must be replaced.' });
    }

    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return reply(500, { error: 'Server configuration error' });
    const authHeaders = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const businessResponse = await fetch(`${url}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&status=eq.pending&select=id,trading_name,email&limit=1`, { headers: authHeaders });
    if (!businessResponse.ok) throw new Error('Could not load pending application');
    const businesses = await businessResponse.json();
    const business = businesses?.[0];
    if (!business) return reply(404, { error: 'Pending application not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const createResponse = await fetch(`${url}/rest/v1/business_application_review_requests`, {
      method: 'POST',
      headers: { ...authHeaders, Prefer: 'return=representation' },
      body: JSON.stringify([{ business_id: business.id, request_type: requestType, document_key: documentKey, message: message.trim(), status: 'awaiting_applicant', response_token_hash: tokenHash, response_token_expires_at: expiresAt }])
    });
    if (!createResponse.ok) {
      console.error('[request-business-application-info] Insert failed:', await createResponse.text());
      return reply(500, { error: 'Could not save the review request' });
    }
    const rows = await createResponse.json();
    const request = rows?.[0];
    if (!request?.id) return reply(500, { error: 'Could not create the review request' });

    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const appUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://fastcheckin.co.za';
        const link = `${appUrl.replace(/\/$/, '')}/application-review?token=${token}&request=${encodeURIComponent(request.id)}`;
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'FastCheckin <noreply@fastcheckin.co.za>',
          to: [business.email],
          subject: `Additional information required — ${business.trading_name}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:32px auto;padding:28px;color:#292524"><h1 style="color:#d97706">FastCheckIn application review</h1><p>Our team is reviewing the application for <strong>${business.trading_name}</strong> and needs a little more information before it can be approved.</p><div style="background:#f5f5f4;padding:18px;border-radius:10px;white-space:pre-wrap">${message.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div><p>Use the secure link below to respond or upload a clearer/replacement document.</p><p style="margin:26px 0"><a href="${link}" style="background:#ea580c;color:#fff;padding:13px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Respond to application review</a></p><p style="font-size:12px;color:#78716c">This secure link expires in 30 days. If you have questions, reply to this email.</p></div>`
        });
        emailSent = true;
      } catch (emailError) {
        console.error('[request-business-application-info] Email failed:', emailError?.message || emailError);
      }
    }
    return reply(200, { success: true, requestId: request.id, emailSent });
  } catch (error) {
    console.error('[request-business-application-info] Error:', error?.message || error);
    return reply(500, { error: 'Could not request additional application information' });
  }
};
