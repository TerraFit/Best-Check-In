// netlify/functions/submit-appeal.js

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
    const { 
      originalRequestId, 
      businessId, 
      businessName, 
      businessEmail, 
      businessIdDisplay,
      fieldName, 
      currentValue, 
      requestedValue, 
      originalReason, 
      rejectionReason, 
      appealMessage, 
      attachments 
    } = JSON.parse(event.body);

    console.log('📝 Appeal submission received:', { originalRequestId, businessId, fieldName });

    if (!originalRequestId || !businessId || !appealMessage) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Create appeal record
    const { data: appeal, error: appealError } = await supabase
      .from('appeals')
      .insert([{
        original_request_id: originalRequestId,
        business_id: businessId,
        business_name: businessName,
        business_email: businessEmail,
        field_name: fieldName,
        current_value: currentValue,
        requested_value: requestedValue,
        original_reason: originalReason,
        rejection_reason: rejectionReason,
        appeal_message: appealMessage,
        attachments: attachments || [],
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (appealError) {
      console.error('❌ Error creating appeal:', appealError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to submit appeal' })
      };
    }

    // Update original change request status to 'appealed'
    await supabase
      .from('change_requests')
      .update({ status: 'appealed' })
      .eq('id', originalRequestId);

    // Send email to inquiry@fastcheckin.co.za and CC business
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://fastcheckin.co.za/fastcheckin-logo.png" alt="FastCheckin" style="height: 50px;">
          <h1 style="color: #f59e0b; margin: 20px 0 0;">Appeal Request Submitted</h1>
        </div>
        
        <p><strong>Business Name:</strong> ${businessName}</p>
        <p><strong>Business ID:</strong> ${businessIdDisplay || businessId}</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Field:</strong> ${fieldName}</p>
          <p><strong>Current Value:</strong> ${currentValue || '(empty)'}</p>
          <p><strong>Requested Value:</strong> ${requestedValue}</p>
          <p><strong>Original Request Reason:</strong> ${originalReason || 'Not provided'}</p>
          <p><strong>Rejection Reason:</strong> ${rejectionReason || 'Not provided'}</p>
        </div>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Appeal Message:</strong></p>
          <p style="white-space: pre-wrap;">${appealMessage}</p>
        </div>
        
        ${attachments && attachments.length > 0 ? `
          <div style="margin: 20px 0;">
            <p><strong>Attachments:</strong></p>
            <ul>
              ${attachments.map((att, i) => `<li><a href="${att.url}">${att.name}</a></li>`).join('')}
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
      cc: [businessEmail],
      subject: `Appeal Request – ${businessName} (ID: ${businessIdDisplay || businessId.substring(0, 8)})`,
      html: emailHtml
    });

    console.log('✅ Appeal submitted successfully:', appeal.id);

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
    console.error('🔥 Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
