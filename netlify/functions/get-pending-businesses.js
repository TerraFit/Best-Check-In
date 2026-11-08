import superAdminAuth from './_superAdminAuth.cjs';
import { supabaseFetch } from './lib/supabase-rest.js';

const { requireSuperAdmin, authFailure } = superAdminAuth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed', data: [] }) };

  const auth = requireSuperAdmin(event);
  if (!auth.ok) return authFailure(auth, headers);

  try {
    const data = await supabaseFetch('businesses?status=eq.pending&select=*&order=created_at.desc');
    const businesses = data || [];
    if (businesses.length) {
      const ids = businesses.map((business) => business.id).filter(Boolean);
      const idFilter = ids.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
      try {
        const attempts = await supabaseFetch(`registration_application_tokens?business_id=in.(${idFilter})&select=business_id,created_at,email_send_status,email_sent_at,email_error&order=created_at.desc`);
        const latestByBusiness = new Map();
        for (const attempt of attempts || []) {
          if (!latestByBusiness.has(attempt.business_id)) latestByBusiness.set(attempt.business_id, attempt);
        }
        for (const business of businesses) {
          const latest = latestByBusiness.get(business.id);
          business.registration_email_send_status = latest?.email_send_status || 'not_attempted';
          business.registration_email_last_attempt_at = latest?.created_at || null;
          business.registration_email_last_sent_at = latest?.email_sent_at || null;
          business.registration_email_last_error = latest?.email_error || null;
        }
      } catch (auditError) {
        // Keep the approval queue available while the additive email-audit migration is pending.
        console.warn('Registration email audit is not available yet:', auditError?.message || auditError);
        for (const business of businesses) business.registration_email_send_status = 'not_available';
      }
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: businesses, count: businesses.length }) };
  } catch (error) {
    console.error('Error loading pending businesses:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to load pending businesses', data: [] }) };
  }
};
