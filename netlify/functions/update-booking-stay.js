// netlify/functions/update-booking-stay.js
// Stay dates are derived from check-in date + nights. Checkout is never a
// user-controlled source of truth; it is recalculated whenever the stay changes.

const jwt = require('jsonwebtoken');
const { calculateCheckOutDate, normalizeNights } = require('./lib/stayDates');

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const { bookingId, check_in_date, nights, business_id } = body;

    if (!bookingId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Booking ID required' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    const currentResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=id,guest_name,business_id,check_in_date,check_out_date,nights`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Accept': 'application/json' } }
    );

    if (!currentResponse.ok) throw new Error(`Failed to fetch current booking: ${await currentResponse.text()}`);
    const currentData = await currentResponse.json();
    const currentBooking = currentData[0];
    if (!currentBooking) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Booking not found' }) };

    const nextCheckIn = check_in_date !== undefined && check_in_date !== null
      ? String(check_in_date).slice(0, 10)
      : String(currentBooking.check_in_date || '').slice(0, 10);
    const nextNights = nights !== undefined && nights !== null
      ? normalizeNights(nights)
      : normalizeNights(currentBooking.nights);

    const nextCheckOut = calculateCheckOutDate(nextCheckIn, nextNights);
    if (!nextCheckOut) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'A valid check-in date and number of nights (minimum 1) are required. Checkout date is calculated automatically.'
        })
      };
    }

    const updateData = { updated_at: new Date().toISOString() };
    const changes = {};

    if (nextCheckIn !== currentBooking.check_in_date) {
      updateData.check_in_date = nextCheckIn;
      changes.check_in_date = { from: currentBooking.check_in_date || 'not set', to: nextCheckIn };
    }

    const oldNights = normalizeNights(currentBooking.nights);
    if (nextNights !== oldNights) {
      updateData.nights = nextNights;
      changes.nights = { from: oldNights ?? 'not set', to: nextNights };
    }

    // Checkout is always derived. Keep it synchronized even when only the
    // booking is being repaired and the caller did not explicitly change dates.
    if (nextCheckOut !== currentBooking.check_out_date) {
      updateData.check_out_date = nextCheckOut;
      changes.check_out_date = { from: currentBooking.check_out_date || 'not set', to: nextCheckOut, derived_from: 'check_in_date + nights' };
    }

    // A client-supplied checkout date is deliberately ignored.
    if (body.check_out_date && String(body.check_out_date).slice(0, 10) !== nextCheckOut) {
      console.warn('⚠️ Ignoring conflicting client checkout date:', body.check_out_date, '→', nextCheckOut);
    }

    if (Object.keys(changes).length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, booking: currentBooking, message: 'No changes needed' }) };
    }

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) throw new Error(`HTTP ${updateResponse.status}: ${await updateResponse.text()}`);
    const result = await updateResponse.json();
    const updatedBooking = result[0];

    try {
      const authHeader = event.headers.authorization || '';
      let userId = '00000000-0000-0000-0000-000000000000';
      let userName = 'System';
      let userRole = 'owner';
      try {
        const token = authHeader.replace('Bearer ', '');
        if (token) {
          const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
          userId = decoded.sub || userId;
          userName = decoded.user_metadata?.full_name || decoded.user_metadata?.name || decoded.user_metadata?.business_name || 'System';
          userRole = decoded.user_metadata?.role || 'owner';
        }
      } catch (tokenError) {
        console.warn('Could not extract user from token:', tokenError.message);
      }

      const guestName = currentBooking.guest_name || 'Unknown Guest';
      const auditLog = {
        business_id: business_id || updatedBooking?.business_id || currentBooking.business_id,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        action: 'UPDATE_STAY_DETAILS',
        details: changes,
        description: `Updated stay details for guest ${guestName}`,
        booking_id: bookingId,
        guest_name: guestName,
        ip_address: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown',
        user_agent: event.headers['user-agent'] || 'unknown',
        created_at: new Date().toISOString()
      };

      const directResponse = await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([auditLog])
      });
      if (!directResponse.ok) console.warn('⚠️ Audit log insert failed:', await directResponse.text());
    } catch (auditError) {
      console.warn('⚠️ Audit log error (non-critical):', auditError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, booking: updatedBooking, changes, message: 'Stay details updated successfully' })
    };
  } catch (error) {
    console.error('❌ Error updating stay details:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message || 'Failed to update stay details' }) };
  }
};
