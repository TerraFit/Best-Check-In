// netlify/functions/update-booking-stay.js
// Stay dates are derived from check-in date + nights. Checkout is never a
// user-controlled source of truth; it is recalculated whenever the stay changes.

import auth from './_auth.cjs';
import { calculateCheckOutDate, normalizeNights } from './lib/stayDates.js';
const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authResult = requireBusinessActor(event);
  if (!authResult.ok) return authFailure(authResult, headers);
  if (!requireBusinessPermission(authResult.principal, 'canManageBookings')) {
    return authFailure({ status: 403, error: 'Forbidden' }, headers);
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { bookingId, check_in_date, nights, business_id } = body;
    if (!bookingId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Booking ID required' }) };

    const tenant = resolveTenant(authResult.principal, business_id);
    if (!tenant.ok) return authFailure(tenant, headers);
    const businessId = tenant.businessId;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    const encodedBookingId = encodeURIComponent(bookingId);
    const encodedBusinessId = encodeURIComponent(businessId);
    const currentResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${encodedBookingId}&business_id=eq.${encodedBusinessId}&select=id,guest_name,business_id,check_in_date,check_out_date,nights`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Accept': 'application/json' } }
    );

    if (!currentResponse.ok) throw new Error('Failed to fetch current booking');
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

    if (nextCheckOut !== currentBooking.check_out_date) {
      updateData.check_out_date = nextCheckOut;
      changes.check_out_date = { from: currentBooking.check_out_date || 'not set', to: nextCheckOut, derived_from: 'check_in_date + nights' };
    }

    if (body.check_out_date && String(body.check_out_date).slice(0, 10) !== nextCheckOut) {
      console.warn('⚠️ Ignoring conflicting client checkout date:', body.check_out_date, '→', nextCheckOut);
    }

    if (Object.keys(changes).length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, booking: currentBooking, message: 'No changes needed' }) };
    }

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${encodedBookingId}&business_id=eq.${encodedBusinessId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) throw new Error('Failed to update booking stay');
    const result = await updateResponse.json();
    const updatedBooking = result[0];
    if (!updatedBooking) throw new Error('Updated booking not returned');

    try {
      const guestName = currentBooking.guest_name || 'Unknown Guest';
      const auditLog = {
        business_id: businessId,
        user_id: authResult.principal.userId || '00000000-0000-0000-0000-000000000000',
        user_name: authResult.principal.email || 'Unknown User',
        user_role: authResult.principal.role || 'business_owner',
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
      if (!directResponse.ok) console.warn('⚠️ Audit log insert failed');
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
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to update stay details' }) };
  }
};
