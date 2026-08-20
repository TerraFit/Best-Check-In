// netlify/functions/submit-change-request.js

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

  try {
    const {
      businessId,
      businessName,
      fieldName,
      currentValue,
      requestedValue,
      reason,
      attachments = [],
      status = 'pending'
    } = JSON.parse(event.body || '{}');

    if (!businessId || !fieldName || !requestedValue || !reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Use Supabase REST only. This function must not import @supabase/supabase-js.
    const authHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    };

    // The production change_requests table currently contains only the request
    // metadata columns below. It does not contain attachments or updated_at.
    // Keep the attachment input accepted for API compatibility, but do not send
    // unsupported columns to PostgREST.
    const attachmentCount = Array.isArray(attachments) ? attachments.length : 0;
    const now = new Date().toISOString();

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/change_requests`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        business_id: businessId,
        business_name: businessName,
        field_name: fieldName,
        current_value: currentValue || '',
        requested_value: requestedValue,
        reason,
        status,
        created_at: now
      })
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('❌ Supabase change request insert error:', insertResponse.status, errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to submit change request',
          details: `Database insert failed (${insertResponse.status})`
        })
      };
    }

    const insertedRows = await insertResponse.json();
    const data = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;

    if (status === 'pending') {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'FastCheckin <notifications@fastcheckin.co.za>',
          to: ['inquiry@fastcheckin.co.za'],
          subject: `📝 Change Request: ${businessName} - ${fieldName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Change Request Submitted</h2>
              <p><strong>Business:</strong> ${businessName}</p>
              <p><strong>Field:</strong> ${fieldName}</p>
              <p><strong>Current Value:</strong> ${currentValue || '(empty)'}</p>
              <p><strong>Requested Value:</strong> ${requestedValue}</p>
              <p><strong>Reason:</strong> ${reason}</p>
              ${attachmentCount > 0 ? `<p><strong>Attachments:</strong> ${attachmentCount} file(s) supplied by client</p>` : ''}
              <hr>
              <p><a href="https://fastcheckin.co.za/super-admin">Review in Super Admin Portal</a></p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Email failure must not make a successfully stored request fail.
      }
    }

    console.log('✅ Change request submitted:', data?.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: status === 'draft' ? 'Change request saved as draft' : 'Change request submitted successfully',
        requestId: data?.id,
        status: data?.status
      })
    };
  } catch (error) {
    console.error('🔥 Unhandled change request error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error?.message || 'Failed to submit change request' })
    };
  }
};
