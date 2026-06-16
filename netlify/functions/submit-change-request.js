// netlify/functions/submit-change-request.js

import { createClient } from '@supabase/supabase-js';

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
    } = JSON.parse(event.body);

    if (!businessId || !fieldName || !requestedValue || !reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle attachments - store in storage bucket
    const attachmentUrls = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.data) {
          // Upload to storage
          const fileName = `${businessId}/${Date.now()}-${attachment.name}`;
          const buffer = Buffer.from(attachment.data.split(',')[1], 'base64');
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('change-request-attachments')
            .upload(fileName, buffer, {
              contentType: attachment.type,
              upsert: true
            });

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('change-request-attachments')
              .getPublicUrl(fileName);
            attachmentUrls.push({
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              url: publicUrl
            });
          } else {
            console.error('Upload error:', uploadError);
            // If upload fails, store base64 directly (fallback)
            attachmentUrls.push({
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              data: attachment.data.substring(0, 200) // Truncate for safety
            });
          }
        }
      }
    }

    // Save change request to database
    const { data, error } = await supabase
      .from('change_requests')
      .insert({
        business_id: businessId,
        business_name: businessName,
        field_name: fieldName,
        current_value: currentValue || '',
        requested_value: requestedValue,
        reason: reason,
        status: status,
        attachments: attachmentUrls,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to submit change request' })
      };
    }

    // If status is 'pending', send email notification to super admin
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
              ${attachments.length > 0 ? `<p><strong>Attachments:</strong> ${attachments.length} file(s)</p>` : ''}
              <hr>
              <p><a href="https://fastcheckin.co.za/super-admin">Review in Super Admin Portal</a></p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Don't fail the request if email fails
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
    console.error('🔥 Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
