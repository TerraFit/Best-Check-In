// netlify/functions/export-marketing-contacts.js
// Authoritative, tenant-scoped marketing contact export.
import auth from './_auth.cjs';
import { supabaseFetch } from './lib/supabase-rest.js';
import { assertFeatureAccess } from './lib/featureAccess.js';

const {
  authenticateRequest,
  requireBusinessPermission,
  requirePlatformPermission,
  resolveTenant,
  authFailure,
} = auth;

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildCsv(contacts) {
  const header = ['First Name', 'Last Name', 'Email', 'Phone', 'Country'].join(',');
  const rows = contacts.map((contact) => [
    csvValue(contact.firstName),
    csvValue(contact.lastName),
    csvValue(contact.email),
    csvValue(contact.phone),
    csvValue(contact.country),
  ].join(','));
  return [header, ...rows].join('\n');
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, HEADERS);

  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);

  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) {
      return authFailure(
        { status: 403, error: 'Missing permission: platform:businesses:read' },
        HEADERS,
      );
    }
  } else if (!requireBusinessPermission(principal, 'canManageMarketing')) {
    return authFailure(
      { status: 403, error: 'Missing permission: canManageMarketing' },
      HEADERS,
    );
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ success: false, error: 'Invalid JSON body' }),
    };
  }

  const scope = resolveTenant(principal, body.businessId || body.business_id);
  if (!scope.ok) return authFailure(scope, HEADERS);

  const businessId = scope.businessId;

  try {
    // Keep the commercial feature gate authoritative and tenant-scoped.
    const denied = await assertFeatureAccess(null, businessId, 'marketing_export');
    if (denied) {
      return {
        statusCode: denied.statusCode,
        headers: HEADERS,
        body: JSON.stringify(denied.body),
      };
    }

    const filters = body.filters || {};
    const params = new URLSearchParams({
      select: 'guest_first_name,guest_last_name,guest_email,guest_phone,guest_country,marketing_consent,created_at',
      business_id: `eq.${businessId}`,
      order: 'created_at.desc',
    });

    const marketingConsent = filters.marketingConsent;
    if (marketingConsent === 'subscribed' || marketingConsent === 'consent_given') {
      params.set('marketing_consent', 'eq.true');
    } else if (marketingConsent === 'unsubscribed' || marketingConsent === 'no_consent') {
      params.set('marketing_consent', 'eq.false');
    }

    if (filters.dateFrom) {
      params.set('created_at', `gte.${filters.dateFrom}T00:00:00.000Z`);
    }

    if (filters.dateTo) {
      // Use an exclusive next-day boundary so the complete selected date is included.
      const end = new Date(`${filters.dateTo}T00:00:00.000Z`);
      if (!Number.isNaN(end.getTime())) {
        end.setUTCDate(end.getUTCDate() + 1);
        const existing = params.get('created_at');
        params.set('created_at', existing
          ? `${existing}&created_at=lt.${end.toISOString()}`
          : `lt.${end.toISOString()}`);
      }
    }

    if (filters.country) {
      params.set('guest_country', `eq.${filters.country}`);
    }

    const rows = await supabaseFetch(`bookings?${params.toString()}`);
    const contacts = (Array.isArray(rows) ? rows : []).map((row) => ({
      firstName: row.guest_first_name || '',
      lastName: row.guest_last_name || '',
      email: row.guest_email || '',
      phone: row.guest_phone || '',
      country: row.guest_country || '',
    }));

    const csv = buildCsv(contacts);

    return {
      statusCode: 200,
      headers: {
        ...HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="marketing-contacts-${new Date().toISOString().split('T')[0]}.csv"`,
      },
      body: csv,
    };
  } catch (error) {
    // Keep sensitive backend details out of the response, but log the exact cause for Netlify.
    console.error('Marketing export failed:', {
      message: error?.message || String(error),
      businessId,
      filters,
    });

    return {
      statusCode: 502,
      headers: HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'Marketing contacts could not be exported',
        code: 'MARKETING_EXPORT_DATA_ERROR',
      }),
    };
  }
};
