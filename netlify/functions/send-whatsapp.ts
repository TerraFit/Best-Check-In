import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  console.log('💬 WhatsApp function triggered');

  try {
    if (!event.body) {
      throw new Error('No data provided');
    }

    const { bookingId, indemnityToken, guest_name, phone, business_name, check_in_date, nights } = JSON.parse(event.body);

    // Validate phone number format
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      console.error('❌ Invalid phone number:', phone);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid phone number format' })
      };
    }

    const indemnityUrl = indemnityToken 
      ? `https://fastcheckin.co.za/indemnity/${indemnityToken}`
      : '';

    // Create message
    const messageBody = `🏨 *${business_name}* - Check-in Confirmed!\n\n` +
      `Hi ${guest_name},\n\n` +
      `Your stay has been confirmed. Here's your signed indemnity form:\n` +
      `${indemnityUrl}\n\n` +
      `📅 Check-in: ${new Date(check_in_date).toLocaleDateString('en-ZA')}\n` +
      `🌙 Nights: ${nights}\n\n` +
      `Need assistance? Reply to this message.\n\n` +
      `✨ *FastCheckin*`;

    // Using Twilio WhatsApp API (requires Twilio account)
    const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

    if (!TWILIO_SID || !TWILIO_AUTH) {
      // Fallback to WhatsApp link
      const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(messageBody)}`;
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          isLink: true,
          whatsappUrl,
          message: 'WhatsApp link generated'
        })
      };
    }

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    
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
