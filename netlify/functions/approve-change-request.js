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
    const { requestId, action, reason, adminEmail } = JSON.parse(event.body);

    console.log('📝 Processing change request:', { requestId, action, reason, adminEmail });

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

    // Get the change request with business details
    const { data: changeRequest, error: fetchError } = await supabase
      .from('change_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !changeRequest) {
      console.error('❌ Error fetching change request:', fetchError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Change request not found' })
      };
    }

    if (changeRequest.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Change request already processed' })
      };
    }

    // Get business email separately
    const { data: business, error: businessFetchError } = await supabase
      .from('businesses')
      .select('email, trading_name, physical_address')
      .eq('id', changeRequest.business_id)
      .single();

    if (businessFetchError) {
      console.error('❌ Error fetching business:', businessFetchError);
    }

    // Update the change request status
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: adminEmail || 'super-admin',
      reviewed_at: new Date().toISOString()
    };
    
    if (action === 'reject') {
      updateData.rejection_reason = reason;
    }

    const { error: updateError } = await supabase
      .from('change_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ Error updating change request:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update change request: ' + updateError.message })
      };
    }

    console.log('✅ Change request status updated to:', action === 'approve' ? 'approved' : 'rejected');

    // If approved, update the business record
    let updateMessage = '';
    if (action === 'approve') {
      const fieldName = changeRequest.field_name;
      const requestedValue = changeRequest.requested_value;
      let updateBusinessData = {};

      // Map the field name to database column
      switch (fieldName) {
        case 'Trading Name':
          updateBusinessData = { trading_name: requestedValue };
          updateMessage = `Your trading name has been updated from "${changeRequest.current_value}" to "${requestedValue}".`;
          break;
        case 'Registered Name':
          updateBusinessData = { registered_name: requestedValue };
          updateMessage = `Your registered name has been updated from "${changeRequest.current_value}" to "${requestedValue}".`;
          break;
        case 'Legal Name':
          updateBusinessData = { legal_name: requestedValue };
          updateMessage = `Your legal name has been updated from "${changeRequest.current_value}" to "${requestedValue}".`;
          break;
        case 'Location':
          // Parse location string "City, Province"
          const parts = requestedValue.split(',').map(s => s.trim());
          const city = parts[0] || '';
          const province = parts[1] || '';
          
          // Get existing physical address or create new one
          const existingAddress = business?.physical_address || {};
          updateBusinessData = {
            physical_address: {
              street: existingAddress.street || '',
              city: city,
              province: province,
              postalCode: existingAddress.postalCode || '',
              country: existingAddress.country || 'South Africa'
            }
          };
          updateMessage = `Your location has been updated to "${requestedValue}".`;
          break;
        default:
          // Generic field update - convert field name to snake_case
          const dbField = fieldName.toLowerCase().replace(/\s+/g, '_');
          updateBusinessData = { [dbField]: requestedValue };
          updateMessage = `Your ${fieldName} has been updated from "${changeRequest.current_value}" to "${requestedValue}".`;
      }

      console.log('📝 Updating business with:', updateBusinessData);

      // Update the business record
      const { error: businessError } = await supabase
        .from('businesses')
        .update(updateBusinessData)
        .eq('id', changeRequest.business_id);

      if (businessError) {
        console.error('❌ Error updating business:', businessError);
      } else {
        console.log('✅ Business updated successfully');
      }
    }

    // Send email notification to business owner
    const businessEmail = business?.email;
    const businessName = business?.trading_name || changeRequest.business_name;

    if (businessEmail) {
      const emailSubject = action === 'approve' 
        ? `✅ Change Request Approved - ${businessName}`
        : `❌ Change Request Rejected - ${businessName}`;
      
      const emailHtml = action === 'approve' ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://fastcheckin.co.za/fastcheckin-logo.png" alt="FastCheckin" style="height: 50px;">
            <h1 style="color: #10b981; margin: 20px 0 0;">Change Request Approved ✓</h1>
          </div>
          
          <p>Dear ${businessName},</p>
          
          <p>Your change request has been <strong style="color: #10b981;">APPROVED</strong> by the administrator.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Request Details:</strong></p>
            <p>Field: ${changeRequest.field_name}</p>
            <p>Previous Value: ${changeRequest.current_value || '(empty)'}</p>
            <p>New Value: ${changeRequest.requested_value}</p>
            <p>Reason for request: ${changeRequest.reason}</p>
          </div>
          
          <p>${updateMessage}</p>
          
          <p>If you have any questions, please contact us at <a href="mailto:support@fastcheckin.co.za">support@fastcheckin.co.za</a>.</p>
          
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
            <h1 style="color: #ef4444; margin: 20px 0 0;">Change Request Rejected ❌</h1>
          </div>
          
          <p>Dear ${businessName},</p>
          
          <p>Your change request has been <strong style="color: #ef4444;">REJECTED</strong> by the administrator.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Request Details:</strong></p>
            <p>Field: ${changeRequest.field_name}</p>
            <p>Requested Value: ${changeRequest.requested_value}</p>
            <p>Reason for request: ${changeRequest.reason}</p>
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

      try {
        await resend.emails.send({
          from: 'FastCheckin <notifications@fastcheckin.co.za>',
          to: [businessEmail],
          subject: emailSubject,
          html: emailHtml
        });
        console.log(`✅ Email sent to ${businessEmail}`);
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
      }
    }

    console.log(`✅ Change request ${action}d: ${requestId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Change request ${action}d successfully`
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
