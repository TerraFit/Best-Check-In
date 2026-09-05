// netlify/functions/submit-change-request.js
import auth from './_auth.cjs';

const {
  requireBusinessActor,
  requireBusinessPermission,
  resolveTenant,
  authFailure,
} = auth;

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: HEADERS,
  body: JSON.stringify(body),
});

// Only business-profile fields are eligible for the manual change-request workflow.
// Platform-controlled fields (status, subscription, service state, etc.) must never
// be user-selectable through this endpoint.
const ALLOWED_FIELDS = new Set([
  'Registered Name',
  'Trading Name',
  'Slogan',
  'Property Details',
  'Directors',
]);

export const handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return createResponse(405, { success: false, error: 'Method Not Allowed' });
  }

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, HEADERS);

  if (!requireBusinessPermission(actor.principal, 'canManageSettings')) {
    return authFailure({ status: 403, error: 'Forbidden' }, HEADERS);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return createResponse(400, { success: false, error: 'Invalid JSON body' });
  }

  const {
    businessId: requestedBusinessId,
    fieldName,
    requestedValue,
    reason,
    attachments = [],
    status,
  } = body;

  if (!requestedBusinessId || !fieldName || !requestedValue || !reason) {
    return createResponse(400, { success: false, error: 'Missing required fields' });
  }

  if (!ALLOWED_FIELDS.has(String(fieldName))) {
    return createResponse(400, { success: false, error: 'Unsupported change request field' });
  }

  if (status !== undefined && status !== 'pending') {
    return createResponse(400, { success: false, error: 'Invalid change request status' });
  }

  const tenant = resolveTenant(actor.principal, requestedBusinessId);
  if (!tenant.ok) return authFailure(tenant, HEADERS);
  const businessId = tenant.businessId;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return createResponse(500, { success: false, error: 'Server configuration error' });
  }

  const authHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    // Resolve authoritative business identity and current values from the tenant-scoped
    // record. Never trust client-supplied businessName/currentValue for the audit trail.
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=id,trading_name,registered_name,legal_name,slogan,total_rooms,avg_price,directors`,
      { headers: authHeaders }
    );

    if (!businessResponse.ok) {
      const errorText = await businessResponse.text();
      console.error('❌ Supabase business lookup error:', businessResponse.status, errorText);
      return createResponse(500, { success: false, error: 'Failed to validate business' });
    }

    let businesses;
    try {
      businesses = await businessResponse.json();
    } catch (error) {
      console.error('❌ Supabase business lookup JSON error:', error);
      return createResponse(500, { success: false, error: 'Failed to validate business' });
    }

    const business = Array.isArray(businesses) ? businesses[0] : businesses;
    if (!business || String(business.id) !== String(businessId)) {
      return createResponse(404, { success: false, error: 'Business not found' });
    }

    const authoritativeValues = {
      'Registered Name': business.registered_name ?? business.legal_name ?? '',
      'Trading Name': business.trading_name ?? '',
      'Slogan': business.slogan ?? '',
      'Property Details': business.total_rooms == null ? '' : String(business.total_rooms),
      'Directors': Array.isArray(business.directors) ? JSON.stringify(business.directors) : (business.directors ?? ''),
    };

    const attachmentUrls = [];

    if (Array.isArray(attachments)) {
      for (const attachment of attachments) {
        if (!attachment?.data) continue;

        const commaIndex = attachment.data.indexOf(',');
        const base64 = commaIndex >= 0 ? attachment.data.slice(commaIndex + 1) : attachment.data;
        const buffer = Buffer.from(base64, 'base64');
        const safeName = String(attachment.name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${businessId}/${Date.now()}-${safeName}`;
        const uploadUrl = `${supabaseUrl}/storage/v1/object/change-request-attachments/${encodeURIComponent(fileName)}`;

        try {
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Content-Type': attachment.type || 'application/octet-stream',
              'x-upsert': 'true',
            },
            body: buffer,
          });

          if (uploadResponse.ok) {
            attachmentUrls.push({
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              url: `${supabaseUrl}/storage/v1/object/public/change-request-attachments/${encodeURIComponent(fileName)}`,
            });
          } else {
            const uploadError = await uploadResponse.text();
            console.error('❌ Attachment upload error:', uploadResponse.status, uploadError);
            attachmentUrls.push({
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              data: attachment.data.substring(0, 200),
            });
          }
        } catch (uploadError) {
          console.error('❌ Attachment upload exception:', uploadError);
          attachmentUrls.push({
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            data: attachment.data.substring(0, 200),
          });
        }
      }
    }

    const now = new Date().toISOString();
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/change_requests`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        business_id: businessId,
        business_name: business.trading_name || business.registered_name || '',
        field_name: fieldName,
        current_value: authoritativeValues[fieldName],
        requested_value: requestedValue,
        reason,
        status: 'pending',
        attachments: attachmentUrls,
        created_at: now,
        updated_at: now,
      }),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('❌ Supabase change request insert error:', insertResponse.status, errorText);
      return createResponse(500, { success: false, error: 'Failed to submit change request' });
    }

    let insertedRows;
    try {
      insertedRows = await insertResponse.json();
    } catch (error) {
      console.error('❌ Supabase change request response JSON error:', error);
      return createResponse(500, { success: false, error: 'Failed to submit change request' });
    }

    const data = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'FastCheckin <notifications@fastcheckin.co.za>',
        to: ['inquiry@fastcheckin.co.za'],
        subject: `📝 Change Request: ${business.trading_name || business.registered_name || businessId} - ${fieldName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Change Request Submitted</h2>
            <p><strong>Business:</strong> ${business.trading_name || business.registered_name || businessId}</p>
            <p><strong>Field:</strong> ${fieldName}</p>
            <p><strong>Current Value:</strong> ${authoritativeValues[fieldName] || '(empty)'}</p>
            <p><strong>Requested Value:</strong> ${requestedValue}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            ${attachmentUrls.length > 0 ? `<p><strong>Attachments:</strong> ${attachmentUrls.length} file(s)</p>` : ''}
            <hr>
            <p><a href="https://fastcheckin.co.za/super-admin">Review in Super Admin Portal</a></p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    console.log('✅ Change request submitted:', data?.id);

    return createResponse(200, {
      success: true,
      message: 'Change request submitted successfully',
      requestId: data?.id,
      status: data?.status || 'pending',
    });
  } catch (error) {
    console.error('🔥 Unhandled change request error:', error);
    return createResponse(500, { success: false, error: 'Internal Server Error' });
  }
};
