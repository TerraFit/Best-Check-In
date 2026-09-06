import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const handler = async function(event) {
  // This function is configured as a Netlify Scheduled Function. Do not use a
  // caller-controlled header as proof of scheduled execution.
  const isScheduled = true;
  console.log('🔄 Running scheduled payment status check...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const results = {
    checked: 0,
    remindersSent: 0,
    critical: 0,
    isScheduled
  };

  try {
    // Get all approved businesses. Scheduled execution is intentionally
    // cross-tenant because this is a platform maintenance job.
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('status', 'approved');

    if (error) {
      console.error('Payment status business lookup failed:', error);
      throw new Error('Payment status check failed');
    }
    
    results.checked = businesses.length;
    console.log(`📊 Found ${businesses.length} approved businesses`);

    for (const business of businesses) {
      try {
        const daysOverdue = calculateOverdueDays(business);
        
        // Update payment status based on days overdue
        let paymentStatus = 'paid';
        if (daysOverdue >= 10) paymentStatus = 'critical';
        else if (daysOverdue >= 5) paymentStatus = 'overdue';
        
        const { error: paymentUpdateError } = await supabase
          .from('businesses')
          .update({ 
            payment_status: paymentStatus
          })
          .eq('id', business.id);

        if (paymentUpdateError) throw paymentUpdateError;

        // Send reminder on the scheduled run only to avoid duplicate/manual spam.
        if (isScheduled && shouldSendReminder(business, daysOverdue)) {
          await sendPaymentReminder(business, daysOverdue);
          results.remindersSent++;
          
          const { error: reminderUpdateError } = await supabase
            .from('businesses')
            .update({ 
              payment_reminder_sent: true,
              payment_reminder_count: (business.payment_reminder_count || 0) + 1,
              last_reminder_sent: new Date().toISOString()
            })
            .eq('id', business.id);

          if (reminderUpdateError) throw reminderUpdateError;
          
          console.log(`📧 Reminder sent to business ${business.id} (${daysOverdue} days overdue)`);
        }

        if (daysOverdue >= 10) {
          results.critical++;
          console.log(`⚠️ CRITICAL: business ${business.id} - ${daysOverdue} days overdue`);
        }
        
      } catch (err) {
        console.error(`❌ Error processing business ${business.id}:`, err?.message || 'unknown error');
      }
    }

    console.log('✅ Payment check complete:', results);
    
    return {
      statusCode: 200,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('❌ Payment check failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment status check failed' })
    };
  }
};

function calculateOverdueDays(business) {
  if (!business.payment_due_date) return 0;
  const dueDate = new Date(business.payment_due_date);
  const today = new Date();
  const diffTime = today.getTime() - dueDate.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function shouldSendReminder(business, daysOverdue) {
  if (daysOverdue <= 0) return false;
  
  // Send on days: 5, 7, 10
  const reminderDays = [5, 7, 10];
  if (!reminderDays.includes(daysOverdue)) return false;
  
  // Check if already sent today
  if (business.last_reminder_sent) {
    const lastSent = new Date(business.last_reminder_sent);
    const today = new Date();
    if (lastSent.toDateString() === today.toDateString()) return false;
  }
  
  return true;
}

async function sendPaymentReminder(business, daysOverdue) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  let subject = '';
  let message = '';
  let urgency = '';

  if (daysOverdue >= 10) {
    subject = `⚠️ URGENT: Your FastCheckin subscription will be suspended`;
    message = `Your payment is ${daysOverdue} days overdue. Your access will be suspended within 24 hours.`;
    urgency = 'critical';
  } else if (daysOverdue >= 5) {
    subject = `⚠️ IMPORTANT: Your FastCheckin payment is overdue`;
    message = `Your payment is ${daysOverdue} days overdue. Please update your payment method.`;
    urgency = 'warning';
  } else {
    return; // Don't send for less than 5 days
  }

  await resend.emails.send({
    from: 'FastCheckin Billing <billing@fastcheckin.app>',
    to: [business.email],
    subject: subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${urgency === 'critical' ? '#dc2626' : '#f59e0b'};">
          Payment ${urgency === 'critical' ? 'URGENT' : 'Reminder'}
        </h2>
        <p>Dear ${business.trading_name},</p>
        <p>${message}</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Days Overdue:</strong> ${daysOverdue}</p>
          <p><strong>Subscription:</strong> ${business.subscription_tier || 'Monthly'}</p>
          <p><strong>Amount Due:</strong> ${business.subscription_tier === 'monthly' ? 'R299' : 'R2,990'}</p>
        </div>
        <a href="https://fastcheckin.netlify.app/billing/${business.id}" 
           style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Update Payment Method
        </a>
        ${daysOverdue >= 10 ? '<p style="color: #dc2626; margin-top: 20px;"><strong>Note:</strong> Access will be suspended tomorrow.</p>' : ''}
        <p style="margin-top: 20px;">Thank you,<br>FastCheckin Billing Team</p>
      </div>
    `
  });
}
