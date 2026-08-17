// netlify/functions/manage-rate-specials.js
// List / create / update rate_specials. applies_to = all | rooms only.

const {
  json,
  optionsResponse,
  requireBusinessAuth,
  supabaseConfig,
  restHeaders,
  mapDbError,
} = require('./lib/rate-auth');

function isValidDate(d) {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

async function assertRoomsOwned(supabaseUrl, supabaseKey, businessId, roomIds) {
  if (!roomIds || roomIds.length === 0) return true;
  for (const rid of roomIds) {
    const res = await fetch(
      supabaseUrl +
        '/rest/v1/rooms?id=eq.' +
        encodeURIComponent(rid) +
        '&business_id=eq.' +
        encodeURIComponent(businessId) +
        '&select=id',
      { headers: restHeaders(supabaseKey) }
    );
    if (!res.ok) return false;
    const rows = await res.json();
    if (!rows || rows.length === 0) return false;
  }
  return true;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return optionsResponse();

  const auth = requireBusinessAuth(event);
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const cfg = supabaseConfig();
  if (!cfg) return json(500, { error: 'Server configuration error' });
  const { supabaseUrl, supabaseKey } = cfg;

  try {
    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      if (qs.businessId && qs.businessId !== businessId) {
        return json(403, { error: 'businessId does not match authenticated business' });
      }
      let path =
        'rate_specials?business_id=eq.' +
        encodeURIComponent(businessId) +
        '&order=effective_from.desc';
      if (qs.activeOnly === 'true') path += '&active=eq.true';

      const res = await fetch(supabaseUrl + '/rest/v1/' + path, {
        headers: restHeaders(supabaseKey),
      });
      if (!res.ok) {
        const t = await res.text();
        const mapped = mapDbError(res.status, t);
        return json(mapped.status, { error: mapped.error });
      }
      const data = await res.json();
      return json(200, { success: true, data: data || [] });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (body.businessId && body.businessId !== businessId) {
        return json(403, { error: 'businessId does not match authenticated business' });
      }

      const name = (body.name || '').trim();
      const special_type = body.special_type || body.specialType;
      const value = Number(body.value);
      const applies_to = body.applies_to || body.appliesTo;
      const room_ids = body.room_ids || body.roomIds || [];
      const effective_from = body.effective_from || body.effectiveFrom;
      const effective_to = body.effective_to || body.effectiveTo;

      if (!name) return json(400, { error: 'name is required' });
      if (special_type !== 'fixed' && special_type !== 'percentage') {
        return json(400, { error: "special_type must be 'fixed' or 'percentage'" });
      }
      if (Number.isNaN(value) || value < 0) {
        return json(400, { error: 'value must be a number >= 0' });
      }
      if (special_type === 'percentage' && value > 100) {
        return json(400, { error: 'percentage value must be 0–100' });
      }
      if (applies_to !== 'all' && applies_to !== 'rooms') {
        return json(400, { error: "applies_to must be 'all' or 'rooms'" });
      }
      if (applies_to === 'rooms' && (!Array.isArray(room_ids) || room_ids.length === 0)) {
        return json(400, { error: 'applies_to=rooms requires at least one room_id' });
      }
      if (!isValidDate(effective_from) || !isValidDate(effective_to)) {
        return json(400, { error: 'effective_from and effective_to must be YYYY-MM-DD' });
      }
      if (effective_from > effective_to) {
        return json(400, { error: 'effective_from must be <= effective_to' });
      }
      if (applies_to === 'rooms') {
        if (!(await assertRoomsOwned(supabaseUrl, supabaseKey, businessId, room_ids))) {
          return json(400, { error: 'One or more rooms not found for this business' });
        }
      }

      const insert = {
        business_id: businessId,
        name,
        special_type,
        value,
        applies_to,
        room_ids: applies_to === 'all' ? [] : room_ids,
        effective_from,
        effective_to,
        active: body.active !== false,
        provider: body.provider || 'manual',
        external_provider_id: body.external_provider_id || body.externalProviderId || null,
      };

      const res = await fetch(supabaseUrl + '/rest/v1/rate_specials', {
        method: 'POST',
        headers: restHeaders(supabaseKey, { Prefer: 'return=representation' }),
        body: JSON.stringify([insert]),
      });
      if (!res.ok) {
        const t = await res.text();
        const mapped = mapDbError(res.status, t);
        return json(mapped.status, { error: mapped.error });
      }
      const rows = await res.json();
      return json(200, { success: true, data: rows[0] });
    }

    if (event.httpMethod === 'PATCH' || event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const id = body.id;
      if (!id) return json(400, { error: 'id is required' });

      const update = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) update.name = String(body.name).trim();
      if (body.value !== undefined) {
        const v = Number(body.value);
        if (Number.isNaN(v) || v < 0) return json(400, { error: 'value must be >= 0' });
        update.value = v;
      }
      if (body.active !== undefined) update.active = !!body.active;
      if (body.effective_from !== undefined || body.effectiveFrom !== undefined) {
        update.effective_from = body.effective_from || body.effectiveFrom;
      }
      if (body.effective_to !== undefined || body.effectiveTo !== undefined) {
        update.effective_to = body.effective_to || body.effectiveTo;
      }
      if (body.room_ids !== undefined || body.roomIds !== undefined) {
        const ids = body.room_ids || body.roomIds || [];
        if (!(await assertRoomsOwned(supabaseUrl, supabaseKey, businessId, ids))) {
          return json(400, { error: 'One or more rooms not found for this business' });
        }
        update.room_ids = ids;
      }

      const res = await fetch(
        supabaseUrl +
          '/rest/v1/rate_specials?id=eq.' +
          encodeURIComponent(id) +
          '&business_id=eq.' +
          encodeURIComponent(businessId),
        {
          method: 'PATCH',
          headers: restHeaders(supabaseKey, { Prefer: 'return=representation' }),
          body: JSON.stringify(update),
        }
      );
      if (!res.ok) {
        const t = await res.text();
        const mapped = mapDbError(res.status, t);
        return json(mapped.status, { error: mapped.error });
      }
      const rows = await res.json();
      if (!rows || !rows[0]) return json(404, { error: 'Special not found' });
      return json(200, { success: true, data: rows[0] });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('manage-rate-specials fatal:', err);
    return json(500, { error: err.message || 'Internal server error' });
  }
};
