import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const handler = async (event) => {
  console.log('⏰ Checking for trial reminders...');

  try {
    // Get system settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('send_reminder_days')
      .single();

    const reminderDays = settings?.send_reminder_days || [3, 1];

    // Find businesses with trials ending soon
    const today = new Date();
    const businessesToNotify = [];

    for (const daysBefore of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + daysBefore);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, trading_name, email, trial_end, subscription_status')
        .eq('subscription_status', 'trialing')
        .gte('trial_end', targetDateStr)
        .lt('trial_end', new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString());

      for (const business of businesses || []) {
        if (!businessesToNotify.find(b => b.id === business.id)) {
          businessesToNotify.push({ ...business, daysBefore });
        }
      }
    }

    // Send reminders
    for (const business of businessesToNotify) {
      await sendReminderEmail(business);
      
      // Log notification
      await supabase.from('notifications').insert({
        business_id: business.id,
        type: 'trial_reminder',
        message: `Your trial ends in ${business.daysBefore} day${business.daysBefore !== 1 ? 's' : ''}`,
        sent_at: new Date().toISOString()
      });
    }

    console.log(`✅ Sent ${businessesToNotify.length} trial reminders`);

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: businessesToNotify.length })
    };

  } catch (error) {
    console.error('Error sending reminders:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function sendReminderEmail(business) {
  const daysLeft = business.daysBefore;
  const subject = daysLeft === 0 
    ? `⚠️ Your FastCheckin trial ends today`
    : `⏰ Your FastCheckin trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;

  await resend.emails.send({
    from: 'FastCheckin <trial@fastcheckin.co.za>',
    to: [business.email],
    subject: subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://fastcheckin.co.za/fastcheckin-logo.png" alt="FastCheckin" style="height: 50px;">
          <h1 style="color: #f59e0b; margin: 20px 0 0;">Trial Ending Soon</h1>
        </div>
        
        <p>Dear ${business.trading_name},</p>
        
        <p>Your <strong>14-day free trial</strong> ends in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>To continue using FastCheckin:</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Add your payment method</li>
            <li>Choose your plan (Starter from R349/month)</li>
            <li>Keep all your guest data</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://fastcheckin.co.za/business/billing" 
             style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Upgrade Now →
          </a>
        </div>
        
        <p style="font-size: 12px; color: #6b7280;">
          No credit card required to continue your trial. Add payment when you're ready.
        </p>
      </div>
    `
  });
}
