// netlify/functions/save-food-restrictions.js
// Authoritative tenant-scoped food restriction write with audit logging.

import auth from './_auth.cjs';

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const response = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const encode = (value) => encodeURIComponent(String(value));

async function supabaseRequest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers);
  if (!requireBusinessPermission(actor.principal, 'canManageBookings')) {
    return authFailure({ status: 403, error: 'Missing permission: canManageBookings' }, headers);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { bookingId, restrictions } = body;
    if (!bookingId || typeof bookingId !== 'string' || bookingId.length > 200) {
      return response(400, { error: 'Booking ID required' });
    }
    if (!restrictions || typeof restrictions !== 'object' || Array.isArray(restrictions)) {
      return response(400, { error: 'Restrictions data required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return response(500, { error: 'Server configuration error' });

    const bookingResponse = await supabaseRequest(
      `bookings?id=eq.${encode(bookingId)}&select=id,guest_name,business_id&limit=1`
    );
    if (!bookingResponse.ok) {
      console.error('Food restriction booking lookup failed:', bookingResponse.status);
      return response(500, { error: 'Failed to validate booking' });
    }
    const bookings = await bookingResponse.json();
    const currentBooking = Array.isArray(bookings) ? bookings[0] : null;
    if (!currentBooking) return response(404, { error: 'Booking not found' });

    const scope = resolveTenant(actor.principal, currentBooking.business_id);
    if (!scope.ok) return authFailure(scope, headers);

    const restrictionData = {
      vegetarian: restrictions.vegetarian === true,
      vegan: restrictions.vegan === true,
      pescatarian: restrictions.pescatarian === true,
      halal: restrictions.halal === true,
      kosher: restrictions.kosher === true,
      gluten_free: restrictions.gluten_free === true,
      lactose_free: restrictions.lactose_free === true,
      nut_allergy: restrictions.nut_allergy === true,
      seafood_allergy: restrictions.seafood_allergy === true,
      diabetic: restrictions.diabetic === true,
      no_pork: restrictions.no_pork === true,
      carnivore: restrictions.carnivore === true,
      other: restrictions.other === true,
      other_text: typeof restrictions.other_text === 'string' ? restrictions.other_text : '',
      updated_at: new Date().toISOString()
    };

    const currentRestrictionsResponse = await supabaseRequest(
      `booking_food_restrictions?booking_id=eq.${encode(bookingId)}&select=*&limit=1`
    );
    if (!currentRestrictionsResponse.ok) {
      console.error('Food restriction lookup failed:', currentRestrictionsResponse.status);
      return response(500, { error: 'Failed to read food restrictions' });
    }
    const currentRestrictionsRows = await currentRestrictionsResponse.json();
    const currentRestrictions = Array.isArray(currentRestrictionsRows) ? currentRestrictionsRows[0] : null;

    let result;
    if (currentRestrictions?.id) {
      const updateResponse = await supabaseRequest(
        `booking_food_restrictions?id=eq.${encode(currentRestrictions.id)}`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(restrictionData) }
      );
      if (!updateResponse.ok) {
        console.error('Food restriction update failed:', updateResponse.status);
        return response(500, { error: 'Failed to save food restrictions' });
      }
      const updated = await updateResponse.json();
      result = Array.isArray(updated) ? updated[0] : null;
    } else {
      const insertResponse = await supabaseRequest(
        'booking_food_restrictions',
        { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify([{ booking_id: bookingId, ...restrictionData, created_at: new Date().toISOString() }]) }
      );
      if (!insertResponse.ok) {
        console.error('Food restriction insert failed:', insertResponse.status);
        return response(500, { error: 'Failed to save food restrictions' });
      }
      const inserted = await insertResponse.json();
      result = Array.isArray(inserted) ? inserted[0] : null;
    }

    try {
      const fields = ['vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher', 'gluten_free', 'lactose_free', 'nut_allergy', 'seafood_allergy', 'diabetic', 'no_pork', 'carnivore', 'other'];
      const changes = {};
      for (const field of fields) {
        const oldValue = currentRestrictions ? currentRestrictions[field] : false;
        const newValue = restrictionData[field];
        if (oldValue !== newValue) changes[field] = { from: oldValue, to: newValue };
      }
      const oldOtherText = currentRestrictions?.other_text || '';
      if (oldOtherText !== restrictionData.other_text) changes.other_text = { from: oldOtherText, to: restrictionData.other_text };

      if (Object.keys(changes).length > 0) {
        const auditLog = {
          business_id: scope.businessId,
          user_id: actor.principal.employeeId || actor.principal.subject || actor.principal.businessId || null,
          user_name: actor.principal.name || 'System',
          user_role: actor.principal.normalizedRole || actor.principal.role || actor.principal.actorType,
          action: 'UPDATE_FOOD_RESTRICTIONS',
          details: changes,
          description: `Updated food restrictions for guest ${currentBooking.guest_name || 'Unknown Guest'}`,
          booking_id: bookingId,
          guest_name: currentBooking.guest_name || 'Unknown Guest',
          ip_address: event.headers?.['client-ip'] || event.headers?.['x-forwarded-for'] || 'unknown',
          user_agent: event.headers?.['user-agent'] || 'unknown',
          created_at: new Date().toISOString()
        };
        const auditResponse = await supabaseRequest('audit_logs', {
          method: 'POST',
          body: JSON.stringify([auditLog])
        });
        if (!auditResponse.ok) console.warn('Food restriction audit log insert failed:', auditResponse.status);
      }
    } catch (auditError) {
      console.warn('Food restriction audit log error:', auditError?.message || auditError);
    }

    return response(200, { success: true, restrictions: result, message: 'Food restrictions saved successfully' });
  } catch (error) {
    console.error('Error saving food restrictions:', error?.message || error);
    if (error instanceof SyntaxError) return response(400, { error: 'Invalid JSON in request body' });
    return response(500, { error: 'Internal server error' });
  }
};
