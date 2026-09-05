import auth from './_auth.cjs';
import { Resend } from 'resend';

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

const ALLOWED_APPEAL_STATUS = 'rejected';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers);

  if (!requireBusinessPermission(actor.principal, 'canManageSettings')) {
    return authFailure({ status: 403, error: 'Forbidden' }, headers);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { originalRequestId, businessId: requestedBusinessId, appealMessage, attachments } = body;
  if (!originalRequestId || !appealMessage || !String(appealMessage).trim()) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Original request ID and appeal message are required' })
    };
  }

  const tenant = resolveTenant(actor.principal, requestedBusinessId);
  if (!tenant.ok) return authFailure(tenant, headers);
  const businessId = tenant.businessId;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  const authHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`
  };

  try {
    // The request itself is the authoritative source for the appeal details.
    // Binding by both request ID and authenticated tenant prevents cross-tenant appeals.
    const requestResponse = await fetch(
      `${supabaseUrl}/rest/v1/change_requests?id=eq.${encodeURIComponent(originalRequestId)}&business_id=eq.${encodeURIComponent(businessId)}&select=id,business_id,field_name,current_value,requested_value,reason,rejection_reason,status`,
      { headers: authHeaders }
    );
    if (!requestResponse.ok) {
      console.error('Failed to load change request:', requestResponse.status);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load change request' })
      };
    }

    let changeRequests;
    try {
      changeRequests = await requestResponse.json();
    } catch {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load change request' })
      };
    }

    const changeRequest = Array.isArray(changeRequests) ? changeRequests[0] : null;
    if (!changeRequest) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Change request not found' })
      };
    }

    if (String(changeRequest.business_id) !== String(businessId)) {
      return authFailure({ status: 403, error: 'Forbidden' }, headers);
    }

    if (changeRequest.status !== ALLOWED_APPEAL_STATUS) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Only rejected change requests can be appealed' })
      };
    }

    // Business identity and contact data are authoritative server-side values.
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=id,trading_name,email`,
      { headers: authHeaders }
    );
    if (!businessResponse.ok) {
      console.error('Failed to load business:', businessResponse.status);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load business' })
      };
    }

    let businesses;
    try {
      businesses = await businessResponse.json();
    } catch {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load business' })
      };
    }

    const business = Array.isArray(businesses) ? businesses[0] : null;
    if (!business || String(business.id) !== String(businessId)) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    const appealPayload = {
      original_request_id: changeRequest.id,
      business_id: businessId,
      business_name: business.trading_name,
      business_email: business.email,
      field_name: changeRequest.field_name,
      current_value: changeRequest.current_value,
      requested_value: changeRequest.requested_value,
      original_reason: changeRequest.reason,
      rejection_reason: changeRequest.rejection_reason,
      appeal_message: String(appealMessage).trim(),
      attachments: safeAttachments,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const appealResponse = await fetch(`${supabaseUrl}/rest/v1/appeals`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify([appealPayload])
    });

    if (!appealResponse.ok) {
      console.error('Failed to create appeal:', appealResponse.status);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to submit appeal' })
      };
    }

    let appeals;
    try {
      appeals = await appealResponse.json();
    } catch {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to submit appeal' })
      };
    }

    const appeal = Array.isArray(appeals) ? appeals[0] : null;
    if (!appeal?.id) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to submit appeal' })
      };
    }

    // Mark only this tenant's authoritative request as appealed.
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/change_requests?id=eq.${encodeURIComponent(changeRequest.id)}&business_id=eq.${encodeURIComponent(businessId)}`,
      {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ status: 'appealed' })
      }
    );

    if (!updateResponse.ok) {
      console.error('Failed to mark change request as appealed:', updateResponse.status);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update change request' })
      };
    }

    // Email delivery is optional operationally; it must not make a persisted appeal fail.
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fastcheckin.co.za/fastcheckin-logo.png" alt="FastCheckin" style="height: 50px;">
              <h1 style="color: #f59e0b; margin: 20px 0 0;">Appeal Request Submitted</h1>
            </div>
            <p><strong>Business Name:</strong> ${business.trading_name}</p>
            <p><strong>Business ID:</strong> ${business.id}</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Field:</strong> ${changeRequest.field_name}</p>
              <p><strong>Current Value:</strong> ${changeRequest.current_value || '(empty)'}</p>
              <p><strong>Requested Value:</strong> ${changeRequest.requested_value}</p>
              <p><strong>Original Request Reason:</strong> ${changeRequest.reason || 'Not provided'}</p>
              <p><strong>Rejection Reason:</strong> ${changeRequest.rejection_reason || 'Not provided'}</p>
            </div>
            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Appeal Message:</strong></p>
              <p style="white-space: pre-wrap;">${String(appealMessage).trim()}</p>
            </div>
            ${safeAttachments.length > 0 ? `
              <div style="margin: 20px 0;">
                <p><strong>Attachments:</strong></p>
                <ul>
                  ${safeAttachments.map(att => `<li><a href="${att?.url || ''}">${att?.name || 'Attachment'}</a></li>`).join('')}
                </ul>
              </div>
            ` : ''}
            <p>Please review this appeal and take appropriate action in the Super Admin portal.</p>
            <hr style="margin: 30px 0; border-color: #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280; text-align: center;">
              FastCheckin - Seamless Check-in, Smarter Stay<br>
              <a href="https://fastcheckin.co.za" style="color: #f59e0b;">www.fastcheckin.co.za</a>
            </p>
          </div>
        `;

        await resend.emails.send({
          from: 'FastCheckin <appeals@fastcheckin.co.za>',
          to: ['inquiry@fastcheckin.co.za'],
          cc: business.email ? [business.email] : [],
          subject: `Appeal Request – ${business.trading_name} (ID: ${String(business.id).substring(0, 8)})`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error('Failed to send appeal email:', emailError);
      }
    }

    console.log('Appeal submitted successfully:', appeal.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Appeal submitted successfully. The admin will review your appeal.',
        appealId: appeal.id
      })
    };
  } catch (error) {
    console.error('Unhandled submit-appeal error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
