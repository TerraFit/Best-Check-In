import type { Handler } from '@netlify/functions';
import auth from './_auth.cjs';

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers) as any;
  if (!requireBusinessPermission(actor.principal, 'canManageBookings')) {
    return authFailure({ status: 403, error: 'Forbidden' }, headers) as any;
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const bookingId = body.bookingId || body.booking_id;
    const requestedBusinessId = body.businessId || body.business_id;
    if (!bookingId || !requestedBusinessId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Booking ID and business ID are required' }) };

    const tenant = resolveTenant(actor.principal, requestedBusinessId);
    if (!tenant.ok) return authFailure(tenant, headers) as any;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    const sbHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };

    const bookingResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&business_id=eq.${encodeURIComponent(tenant.businessId)}&select=id,business_id,guest_name,guest_phone,business_name,check_in_date,nights`,
      { headers: sbHeaders }
    );
    if (!bookingResponse.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to load booking' }) };
    const bookings = await bookingResponse.json();
    const booking = Array.isArray(bookings) ? bookings[0] : null;
    if (!booking) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Booking not found' }) };

    let indemnityToken = '';
    try {
      const indemnityResponse = await fetch(
        `${supabaseUrl}/rest/v1/indemnity_records?booking_id=eq.${encodeURIComponent(booking.id)}&business_id=eq.${encodeURIComponent(tenant.businessId)}&select=access_token&limit=1`,
        { headers: sbHeaders }
      );
      if (indemnityResponse.ok) {
        const records = await indemnityResponse.json();
        indemnityToken = records?.[0]?.access_token || '';
      }
    } catch (error) {
      console.warn('Could not load indemnity token:', error?.message || error);
    }

    const formattedPhone = formatPhoneNumber(booking.guest_phone);
    if (!formattedPhone) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Booking has no valid guest phone number' }) };

    const indemnityUrl = indemnityToken ? `https://fastcheckin.co.za/indemnity/${indemnityToken}` : '';
    const messageBody = `🏨 *${booking.business_name || 'Your Stay'}* - Check-in Confirmed!\n\nHi ${booking.guest_name || 'Guest'},\n\nYour stay has been confirmed.${indemnityUrl ? ` Here's your signed indemnity form:\n${indemnityUrl}\n` : ''}\n📅 Check-in: ${new Date(booking.check_in_date).toLocaleDateString('en-ZA')}\n🌙 Nights: ${booking.nights || 1}\n\nNeed assistance? Reply to this message.\n\n✨ *FastCheckin*`;

    const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

    if (!TWILIO_SID || !TWILIO_AUTH) {
      const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(messageBody)}`;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, isLink: true, whatsappUrl, message: 'WhatsApp link generated' }) };
    }

    const authHeader = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: `whatsapp:${TWILIO_WHATSAPP}`, To: `whatsapp:${formattedPhone}`, Body: messageBody })
    });
    const result = await response.json();
    if (!response.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: 'WhatsApp send failed' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sid: result.sid }) };
  } catch (error) {
    console.error('WhatsApp function error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send WhatsApp' }) };
  }
};

function formatPhoneNumber(phone: string): string | null {
  const value = String(phone || '');
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.startsWith('27') && cleaned.length === 11) return `+${cleaned}`;
  if (cleaned.startsWith('0') && cleaned.length === 10) return `+27${cleaned.substring(1)}`;
  if (cleaned.length === 9 && !cleaned.startsWith('0')) return `+27${cleaned}`;
  if (value.startsWith('+')) return value;
  return null;
}
