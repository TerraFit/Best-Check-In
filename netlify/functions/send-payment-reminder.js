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
    const { businessId, daysOverdue } = JSON.parse(event.body);

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    // Get business details
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (fetchError || !business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    // Send reminder email
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    let subject = '';
    let message = '';
    let urgency = '';

    if (daysOverdue >= 10) {
      subject = `⚠️ URGENT: Your FastCheckin subscription will be suspended`;
      message = `Your payment is ${daysOverdue} days overdue. As per our terms, your FastCheckin access will be suspended within 24 hours if payment is not received.`;
      urgency = 'critical';
    } else if (daysOverdue >= 5) {
      subject = `⚠️ IMPORTANT: Your FastCheckin payment is overdue`;
      message = `Your payment is ${daysOverdue} days overdue. Please update your payment method immediately to avoid service interruption.`;
      urgency = 'warning';
    } else {
      subject = `Reminder: FastCheckin payment overdue`;
      message = `Your payment is currently overdue. Please update your payment method at your earliest convenience.`;
      urgency = 'reminder';
    }

    await resend.emails.send({
      from: 'FastCheckin Billing <billing@fastcheckin.app>',
      to: [business.email],
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${urgency === 'critical' ? '#dc2626' : urgency === 'warning' ? '#f59e0b' : '#3b82f6'};">
            Payment ${urgency === 'critical' ? 'URGENT' : 'Reminder'}
          </h2>
          <p>Dear ${business.trading_name},</p>
          <p>${message}</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Days Overdue:</strong> ${daysOverdue}</p>
            <p><strong>Subscription:</strong> ${business.subscription_tier}</p>
            <p><strong>Amount Due:</strong> ${business.subscription_tier === 'monthly' ? 'R299' : 'R2,990'}</p>
          </div>
          <a href="https://fastcheckin.app/billing/${business.id}" 
             style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            Update Payment Method
          </a>
          ${daysOverdue >= 10 ? '<p style="color: #dc2626; margin-top: 20px;"><strong>Note:</strong> Your access will be suspended if payment is not received within 24 hours.</p>' : ''}
          <p style="margin-top: 20px;">Thank you,<br>FastCheckin Billing Team</p>
        </div>
      `
    });

    // Update reminder count
    await supabase
      .from('businesses')
      .update({ 
        payment_reminder_sent: true,
        payment_reminder_count: (business.payment_reminder_count || 0) + 1
      })
      .eq('id', businessId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Payment reminder sent',
        urgency
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
