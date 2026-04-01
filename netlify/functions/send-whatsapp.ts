import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  console.log('💬 WhatsApp function triggered');

  try {
    if (!event.body) {
      throw new Error('No data provided');
    }

    const { phone, guest_name, business_name, check_in_date } = JSON.parse(event.body);

    // Validate phone number format
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      console.error('❌ Invalid phone number:', phone);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid phone number format' })
      };
    }

    // Using Twilio WhatsApp API
    const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

    if (!TWILIO_SID || !TWILIO_AUTH) {
      console.error('❌ Twilio credentials not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'WhatsApp service not configured' })
      };
    }

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    
    const messageBody = `🏨 *Check-in Confirmed!*\n\n` +
      `Hi ${guest_name},\n\n` +
      `Your stay at *${business_name}* is confirmed.\n` +
      `📅 Check-in: ${new Date(check_in_date).toLocaleDateString('en-ZA')}\n\n` +
      `Questions? Reply to this message.\n\n` +
      `✨ *FastCheckin*`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: `whatsapp:${TWILIO_WHATSAPP}`,
          To: `whatsapp:${formattedPhone}`,
          Body: messageBody
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Twilio API error:', result);
      throw new Error(result.message || 'WhatsApp send failed');
    }

    console.log('✅ WhatsApp sent successfully:', result.sid);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sid: result.sid })
    };

  } catch (error) {
    console.error('❌ WhatsApp function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send WhatsApp',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

function formatPhoneNumber(phone: string): string | null {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // South African numbers
  if (cleaned.startsWith('27') && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+27${cleaned.substring(1)}`;
  }
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    return `+27${cleaned}`;
  }
  
  // International numbers - return as-is with plus
  if (phone.startsWith('+')) {
    return phone;
  }
  
  return null;
}
