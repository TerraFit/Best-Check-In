// netlify/functions/approve-change-request.js

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { requestId, action, reason, adminEmail, isAppeal } = JSON.parse(event.body);

    if (!requestId || !action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request ID and action are required' })
      };
    }

    if (action !== 'approve' && action !== 'reject') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action must be "approve" or "reject"' })
      };
    }

    let changeRequest;
    let isAppealRequest = isAppeal || false;

    // Get the change request or appeal
    if (isAppealRequest) {
      const { data: appeal, error: appealError } = await supabase
        .from('appeals')
        .select('*, businesses(email, trading_name, id)')
        .eq('id', requestId)
        .single();

      if (appealError || !appeal) {
        console.error('❌ Error fetching appeal:', appealError);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Appeal not found' })
        };
      }
      changeRequest = appeal;
    } else {
      const { data: request, error: requestError } = await supabase
        .from('change_requests')
        .select('*, businesses(email, trading_name)')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        console.error('❌ Error fetching change request:', requestError);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Change request not found' })
        };
      }
      changeRequest = request;
    }

    if (changeRequest.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request already processed' })
      };
    }

    // Update status
    const table = isAppealRequest ? 'appeals' : 'change_requests';
    const { error: updateError } = await supabase
      .from(table)
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: adminEmail || 'super-admin',
        reviewed_at: new Date().toISOString(),
        rejection_reason_final: action === 'reject' ? reason : null
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ Error updating:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update request' })
      };
    }

    // If approving a change request (not appeal), update business
    let updateMessage = '';
    if (action === 'approve' && !isAppealRequest) {
      const fieldName = changeRequest.field_name;
      const requestedValue = changeRequest.requested_value;
      let updateData = {};

      switch (fieldName) {
        case 'Trading Name':
          updateData = { trading_name: requestedValue };
          updateMessage = `Your trading name has been updated from "${changeRequest.current_value}" to "${requestedValue}".`;
          break;
        case 'Registered Name':
          updateData = { registered_name: requestedValue };
          updateMessage = `Your registered name has been updated from "${changeRequest.current_value}" to "${requestedValue}".`;
          break;
        case 'Legal Name':
          updateData = { legal_name: requestedValue };
          updateMessage = `Your legal name has been updated from "${changeRequest.current_value}" to "${requestedValue}".`;
          break;
        case 'Location':
          const parts = requestedValue.split(',').map(s => s.trim());
          const city = parts[0] || '';
          const province = parts[1] || '';
          updateData = {
            physical_address: {
              ...(changeRequest.businesses?.physical_address || {}),
              city: city,
              province: province
            }
          };
          updateMessage = `Your location has been updated to "${requestedValue}".`;
          break;
        default:
          const dbField = fieldName.toLowerCase().replace(/\s+/g, '_');
          updateData = { [dbField]: requestedValue };
          updateMessage = `Your ${fieldName} has been updated from "${changeRequest.current_value}" to "${requestedValue}".`;
      }

      const { error: businessError } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', changeRequest.business_id);

      if (businessError) {
        console.error('❌ Error updating business:', businessError);
      }
    }

    // If approving an appeal, update the original change request and business
    if (action === 'approve' && isAppealRequest) {
      // Get original change request
      const { data: originalRequest } = await supabase
        .from('change_requests')
        .select('*')
        .eq('id', changeRequest.original_request_id)
        .single();

      if (originalRequest) {
        // Update business with the requested value
        const fieldName = originalRequest.field_name;
        const requestedValue = originalRequest.requested_value;
        let updateData = {};

        switch (fieldName) {
          case 'Trading Name':
            updateData = { trading_name: requestedValue };
            break;
          case 'Registered Name':
            updateData = { registered_name: requestedValue };
            break;
          case 'Legal Name':
            updateData = { legal_name: requestedValue };
            break;
          case 'Location':
            const parts = requestedValue.split(',').map(s => s.trim());
            updateData = {
              physical_address: {
                ...(changeRequest.businesses?.physical_address || {}),
                city: parts[0] || '',
                province: parts[1] || ''
              }
            };
            break;
          default:
            const dbField = fieldName.toLowerCase().replace(/\s+/g, '_');
            updateData = { [dbField]: requestedValue };
        }

        await supabase
          .from('businesses')
          .update(updateData)
          .eq('id', changeRequest.business_id);

        // Update original request status
        await supabase
          .from('change_requests')
          .update({ status: 'approved' })
          .eq('id', changeRequest.original_request_id);

        updateMessage = `Your appeal was approved! Your ${fieldName} has been updated to "${requestedValue}".`;
      }
    }

    // Send email notification
    const businessEmail = changeRequest.businesses?.email;
    const businessName = changeRequest.businesses?.trading_name || changeRequest.business_name;

    if (businessEmail) {
      const emailSubject = action === 'approve' 
        ? `✅ ${isAppealRequest ? 'Appeal' : 'Change Request'} Approved - ${businessName}`
        : `❌ ${isAppealRequest ? 'Appeal' : 'Change Request'} Rejected - ${businessName}`;
      
      const emailHtml = action === 'approve' ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://fastcheckin.co.za/fastcheckin-logo.png" alt="FastCheckin" style="height: 50px;">
            <h1 style="color: #10b981; margin: 20px 0 0;">${isAppealRequest ? 'Appeal' : 'Change Request'} Approved ✓</h1>
          </div>
          
          <p>Dear ${businessName},</p>
          
          <p>Your ${isAppealRequest ? 'appeal has been' : 'change request has been'} <strong style="color: #10b981;">APPROVED</strong> by the administrator.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Request Details:</strong></p>
            <p>Field: ${changeRequest.field_name}</p>
            <p>New Value: ${changeRequest.requested_value}</p>
          </div>
          
          <p>${updateMessage || 'The changes have been applied to your business profile.'}</p>
          
          <hr style="margin: 30px 0; border-color: #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280; text-align: center;">
            FastCheckin - Seamless Check-in, Smarter Stay<br>
            <a href="https://fastcheckin.co.za" style="color: #f59e0b;">www.fastcheckin.co.za</a>
          </p>
        </div>
      ` : `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://fastcheckin.co.za/fastcheckin-logo.png" alt="FastCheckin" style="height: 50px;">
            <h1 style="color: #ef4444; margin: 20px 0 0;">${isAppealRequest ? 'Appeal' : 'Change Request'} Rejected ❌</h1>
          </div>
          
          <p>Dear ${businessName},</p>
          
          <p>Your ${isAppealRequest ? 'appeal has been' : 'change request has been'} <strong style="color: #ef4444;">REJECTED</strong> by the administrator.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Request Details:</strong></p>
            <p>Field: ${changeRequest.field_name}</p>
            <p>Requested Value: ${changeRequest.requested_value}</p>
            <p style="color: #dc2626;"><strong>Rejection Reason:</strong> ${reason || 'No specific reason provided'}</p>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0;"><strong>💡 What can you do?</strong></p>
            <p style="margin: 10px 0 0;">You can submit a new change request with additional information from your business dashboard.</p>
          </div>
          
          <hr style="margin: 30px 0; border-color: #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280; text-align: center;">
            FastCheckin - Seamless Check-in, Smarter Stay<br>
            <a href="https://fastcheckin.co.za" style="color: #f59e0b;">www.fastcheckin.co.za</a>
          </p>
        </div>
      `;

      await resend.emails.send({
        from: 'FastCheckin <notifications@fastcheckin.co.za>',
        to: [businessEmail],
        subject: emailSubject,
        html: emailHtml
      });
    }

    console.log(`✅ ${isAppealRequest ? 'Appeal' : 'Change request'} ${action}d: ${requestId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${isAppealRequest ? 'Appeal' : 'Change request'} ${action}d successfully`
      })
    };

  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
