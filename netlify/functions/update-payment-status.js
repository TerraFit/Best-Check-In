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

  try {
    const { 
      businessId, 
      paymentStatus, 
      paymentDate,
      sendReminder = false 
    } = JSON.parse(event.body);

    if (!businessId || !paymentStatus) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID and payment status required' })
      };
    }

    // Calculate new due date based on subscription tier
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('subscription_tier, email, trading_name')
      .eq('id', businessId)
      .single();

    if (fetchError) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();
    const dueDate = new Date(paymentDateObj);
    
    // Set next due date based on subscription
    if (business.subscription_tier === 'annual') {
      dueDate.setFullYear(dueDate.getFullYear() + 1);
    } else {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    // Update business payment info
    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        payment_status: paymentStatus,
        last_payment_date: paymentDateObj.toISOString(),
        payment_due_date: dueDate.toISOString(),
        payment_reminder_sent: false,
        days_overdue: 0
      })
      .eq('id', businessId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update payment status' })
      };
    }

    // Send confirmation email if requested
    if (sendReminder) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: 'FastCheckin Billing <billing@fastcheckin.app>',
        to: [business.email],
        subject: `Payment Received - FastCheckin`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Payment Confirmed ✓</h2>
            <p>Dear ${business.trading_name},</p>
            <p>We've received your payment. Thank you for staying current with your subscription!</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Payment Date:</strong> ${paymentDateObj.toLocaleDateString()}</p>
              <p><strong>Next Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
              <p><strong>Status:</strong> Active</p>
            </div>
            <p>Best regards,<br>FastCheckin Team</p>
          </div>
        `
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment status updated',
        next_due_date: dueDate.toISOString()
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
