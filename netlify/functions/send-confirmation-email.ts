import type { Handler } from '@netlify/functions';
import { handler as legacyHandler } from './lib/send-confirmation-email-legacy';

interface ConfirmationRequest {
  booking_id?: string;
  indemnity_token?: string;
  id?: string;
  booking_id_alias?: string;
}

interface BookingRecord {
  id: string;
  business_id: string;
  guest_name: string | null;
  guest_email: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number | null;
  total_amount: number | null;
  marketing_consent: boolean | null;
}

interface IndemnityRecord {
  booking_id: string;
  business_id: string;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function response(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  try {
    if (!event.body) {
      return response(400, { error: 'Request body required' });
    }

    let request: ConfirmationRequest;
    try {
      request = JSON.parse(event.body);
    } catch {
      return response(400, { error: 'Invalid JSON' });
    }

    const bookingId = request.booking_id || request.id || request.booking_id_alias;
    const indemnityToken = request.indemnity_token;

    if (!bookingId || typeof bookingId !== 'string' || !indemnityToken || typeof indemnityToken !== 'string') {
      return response(400, { error: 'booking_id and indemnity_token are required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return response(500, { error: 'Server configuration error' });
    }

    const restHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };

    const encodedToken = encodeURIComponent(indemnityToken);
    const encodedBookingId = encodeURIComponent(bookingId);

    const indemnityResponse = await fetch(
      `${supabaseUrl}/rest/v1/indemnity_records?access_token=eq.${encodedToken}&booking_id=eq.${encodedBookingId}&select=booking_id,business_id&limit=1`,
      { headers: restHeaders }
    );

    if (!indemnityResponse.ok) {
      console.error('❌ Indemnity capability lookup failed:', indemnityResponse.status);
      return response(403, { error: 'Invalid booking capability' });
    }

    const indemnityRecords = (await indemnityResponse.json()) as IndemnityRecord[];
    const indemnity = indemnityRecords[0];

    if (!indemnity || indemnity.booking_id !== bookingId || !indemnity.business_id) {
      return response(403, { error: 'Invalid booking capability' });
    }

    const bookingResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${encodedBookingId}&business_id=eq.${encodeURIComponent(indemnity.business_id)}&select=id,business_id,guest_name,guest_email,check_in_date,check_out_date,nights,total_amount,marketing_consent&limit=1`,
      { headers: restHeaders }
    );

    if (!bookingResponse.ok) {
      console.error('❌ Booking lookup failed:', bookingResponse.status);
      return response(500, { error: 'Unable to validate booking' });
    }

    const bookings = (await bookingResponse.json()) as BookingRecord[];
    const booking = bookings[0];

    if (!booking || booking.id !== bookingId || booking.business_id !== indemnity.business_id || !booking.guest_email) {
      return response(403, { error: 'Booking not found or not eligible for confirmation' });
    }

    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(booking.business_id)}&select=trading_name,logo_url,newsletter_enabled,newsletter_title,newsletter_prize,newsletter_cta,newsletter_terms,newsletter_draw_date,newsletter_share_text&limit=1`,
      { headers: restHeaders }
    );

    if (!businessResponse.ok) {
      console.error('❌ Business lookup failed:', businessResponse.status);
      return response(500, { error: 'Unable to load business details' });
    }

    const businesses = await businessResponse.json() as Array<{
      trading_name: string | null;
      logo_url: string | null;
      newsletter_enabled: boolean | null;
      newsletter_title: string | null;
      newsletter_prize: string | null;
      newsletter_cta: string | null;
      newsletter_terms: string | null;
      newsletter_draw_date: string | null;
      newsletter_share_text: string | null;
    }>;
    const business = businesses[0];

    if (!business) {
      return response(403, { error: 'Business not found' });
    }

    const authoritativeBooking = {
      guest_name: booking.guest_name || '',
      guest_email: booking.guest_email,
      check_in_date: booking.check_in_date || '',
      check_out_date: booking.check_out_date || '',
      nights: Number(booking.nights || 0),
      business_name: business.trading_name || 'your accommodation',
      business_logo: business.logo_url || undefined,
      total_amount: Number(booking.total_amount || 0),
      business_id: booking.business_id,
      indemnity_token: indemnityToken,
      marketing_consent: booking.marketing_consent === true
    };

    // The legacy renderer/sender is now an internal helper only. It receives
    // exclusively server-derived booking, business and consent data.
    return legacyHandler(
      {
        ...event,
        body: JSON.stringify(authoritativeBooking)
      },
      context
    );
  } catch (error) {
    console.error('❌ Confirmation authorization error:', error);
    return response(500, { error: 'Unable to process confirmation request' });
  }
};
