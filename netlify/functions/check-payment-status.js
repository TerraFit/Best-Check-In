import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const handler = async function(event) {
  console.log('🔄 Running payment status check...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get all approved businesses
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('status', 'approved');

    if (error) throw error;

    const results = {
      checked: businesses.length,
      remindersSent: 0,
      critical: 0,
      errors: []
    };

    for (const business of businesses) {
      try {
        const daysOverdue = calculateOverdueDays(business);
        
        // Update payment status
        await supabase
          .from('businesses')
          .update({ 
            days_overdue: daysOverdue,
            payment_status: getPaymentStatus(daysOverdue)
          })
          .eq('id', business.id);

        // Send reminder if overdue and not sent recently
        if (daysOverdue > 0 && shouldSendReminder(business, daysOverdue)) {
          await sendReminder(business, daysOverdue);
          results.remindersSent++;
        }

        if (daysOverdue >= 10) results.critical++;
        
      } catch (err) {
        results.errors.push({ business: business.id, error: err.message });
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
      body: JSON.stringify({ error: error.message })
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

function getPaymentStatus(daysOverdue) {
  if (daysOverdue === 0) return 'paid';
  if (daysOverdue >= 10) return 'critical';
  if (daysOverdue >= 5) return 'overdue';
  return 'paid';
}

function shouldSendReminder(business, daysOverdue) {
  // Send on day 5, day 7, and day 10
  return [5, 7, 10].includes(daysOverdue) && 
         (!business.last_reminder_sent || 
          new Date(business.last_reminder_sent).getDate() !== new Date().getDate());
}

async function sendReminder(business, daysOverdue) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'FastCheckin Billing <billing@fastcheckin.app>',
    to: [business.email],
    subject: daysOverdue >= 10 ? 'URGENT: Your FastCheckin subscription' : 'Payment Reminder',
    html: `
      <h2>Payment ${daysOverdue >= 10 ? 'Critical' : 'Reminder'}</h2>
      <p>Your payment is ${daysOverdue} days overdue.</p>
      <a href="https://fastcheckin.app/billing/${business.id}">Update Payment</a>
    `
  });
}
