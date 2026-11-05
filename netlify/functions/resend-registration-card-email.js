import crypto from 'node:crypto';
import { Resend } from 'resend';
import superAdminAuth from './_superAdminAuth.cjs';
import { buildRegistrationCardEmail } from './lib/registration-card-email.js';

const { requireSuperAdmin, authFailure } = superAdminAuth;
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

  const auth = requireSuperAdmin(event);
  if (!auth.ok) return authFailure(auth, headers);

  try {
    const { businessId } = JSON.parse(event.body || '{}');
    if (typeof businessId !== 'string' || !businessId.trim()) return reply(400, { error: 'Business ID is required' });

    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return reply(500, { error: 'Server configuration error' });

    const authHeaders = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const businessResponse = await fetch(`${url}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&status=eq.pending&select=id,trading_name,email,registration_payment_status&limit=1`, { headers: authHeaders });
    if (!businessResponse.ok) throw new Error('Could not load pending application');
    const business = (await businessResponse.json())?.[0];
    if (!business) return reply(404, { error: 'Pending application not found' });
    if (business.registration_payment_status === 'verified') return reply(409, { error: 'Peach card validation is already complete' });
    if (!process.env.RESEND_API_KEY) return reply(503, { error: 'Email service is not configured. No validation link was issued.' });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    // Retire all prior unused links before issuing the replacement.
    const retireResponse = await fetch(`${url}/rest/v1/registration_application_tokens?business_id=eq.${encodeURIComponent(business.id)}&used_at=is.null`, {
      method: 'PATCH',
      headers: { ...authHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ used_at: now.toISOString() })
    });
    if (!retireResponse.ok) throw new Error('Could not invalidate previous application links');

    const tokenResponse = await fetch(`${url}/rest/v1/registration_application_tokens`, {
      method: 'POST',
      headers: { ...authHeaders, Prefer: 'return=representation' },
      body: JSON.stringify([{
        token_hash: tokenHash,
        business_id: business.id,
        expires_at: expiresAt,
        email_send_status: 'sending',
        created_by: auth.principal?.userId || auth.principal?.email || 'superadmin'
      }])
    });
    if (!tokenResponse.ok) {
      console.error('[resend-registration-card-email] Token insert failed:', await tokenResponse.text());
      return reply(500, { error: 'Could not create a secure validation link' });
    }

    const appUrl = (process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || process.env.PUBLIC_APP_URL || process.env.URL || 'https://fastcheckin.co.za').replace(/\/$/, '');
    const validationUrl = `${appUrl}/registration-payment?token=${encodeURIComponent(token)}`;
    const email = buildRegistrationCardEmail({ businessName: business.trading_name, validationUrl });

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: 'FastCheckIn <noreply@fastcheckin.co.za>',
        to: [business.email],
        subject: email.subject,
        html: email.html,
        text: email.text
      });
      if (result?.error) throw new Error(result.error.message || 'Email provider rejected the message');

      const sentAt = new Date().toISOString();
      const auditResponse = await fetch(`${url}/rest/v1/registration_application_tokens?token_hash=eq.${tokenHash}`, {
        method: 'PATCH',
        headers: { ...authHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ email_send_status: 'accepted', email_sent_at: sentAt, resend_email_id: result?.data?.id || null, email_error: null })
      });
      const auditRecorded = auditResponse.ok;
      if (!auditRecorded) console.error('[resend-registration-card-email] Email accepted but audit update failed:', await auditResponse.text());

      return reply(200, { success: true, emailSent: true, auditRecorded, sentAt, expiresAt, message: `Peach validation email accepted by the email provider for ${business.email}.` });
    } catch (emailError) {
      const message = String(emailError?.message || 'Email could not be sent').slice(0, 500);
      await fetch(`${url}/rest/v1/registration_application_tokens?token_hash=eq.${tokenHash}`, {
        method: 'PATCH',
        headers: { ...authHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ used_at: new Date().toISOString(), email_send_status: 'failed', email_error: message })
      }).catch(() => undefined);
      console.error('[resend-registration-card-email] Send failed:', message);
      return reply(502, { error: 'The validation email could not be sent. The new link has been disabled; you can safely retry.' });
    }
  } catch (error) {
    console.error('[resend-registration-card-email] Error:', error?.message || error);
    return reply(500, { error: 'Could not resend Peach card validation email' });
  }
};
