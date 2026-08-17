// netlify/functions/manage-room-rates.js
// List / create / update room_rates. Scoped by authenticated business_id.

const {
  json,
  optionsResponse,
  requireBusinessAuth,
  supabaseConfig,
  restHeaders,
  mapDbError,
} = require('./lib/rate-auth');

async function assertRoomOwned(supabaseUrl, supabaseKey, businessId, roomId) {
  const res = await fetch(
    supabaseUrl +
      '/rest/v1/rooms?id=eq.' +
      encodeURIComponent(roomId) +
      '&business_id=eq.' +
      encodeURIComponent(businessId) +
      '&select=id',
    { headers: restHeaders(supabaseKey) }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function assertSeasonOwned(supabaseUrl, supabaseKey, businessId, seasonId) {
  if (!seasonId) return true;
  const res = await fetch(
    supabaseUrl +
      '/rest/v1/business_seasons?id=eq.' +
      encodeURIComponent(seasonId) +
      '&business_id=eq.' +
      encodeURIComponent(businessId) +
      '&select=id',
    { headers: restHeaders(supabaseKey) }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
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
        'room_rates?business_id=eq.' + encodeURIComponent(businessId) + '&order=created_at.desc';
      if (qs.roomId) path += '&room_id=eq.' + encodeURIComponent(qs.roomId);
      if (qs.seasonId) path += '&season_id=eq.' + encodeURIComponent(qs.seasonId);
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
      const room_id = body.room_id || body.roomId;
      const season_id = body.season_id != null ? body.season_id : body.seasonId;
      const rate_amount =
        body.rate_amount != null ? Number(body.rate_amount) : Number(body.rateAmount);

      if (!room_id) return json(400, { error: 'room_id is required' });
      if (Number.isNaN(rate_amount) || rate_amount < 0) {
        return json(400, { error: 'rate_amount must be a number >= 0' });
      }

      if (!(await assertRoomOwned(supabaseUrl, supabaseKey, businessId, room_id))) {
        return json(400, { error: 'Room not found for this business' });
      }
      if (season_id && !(await assertSeasonOwned(supabaseUrl, supabaseKey, businessId, season_id))) {
        return json(400, { error: 'Season not found for this business' });
      }

      const insert = {
        business_id: businessId,
        room_id,
        season_id: season_id || null,
        rate_amount,
        currency: body.currency || 'ZAR',
        provider: body.provider || 'manual',
        external_provider_id: body.external_provider_id || body.externalProviderId || null,
        active: body.active !== false,
      };

      const res = await fetch(supabaseUrl + '/rest/v1/room_rates', {
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
      if (body.rate_amount !== undefined || body.rateAmount !== undefined) {
        const v = Number(body.rate_amount != null ? body.rate_amount : body.rateAmount);
        if (Number.isNaN(v) || v < 0) return json(400, { error: 'rate_amount must be >= 0' });
        update.rate_amount = v;
      }
      if (body.currency !== undefined) update.currency = body.currency;
      if (body.active !== undefined) update.active = !!body.active;
      if (body.season_id !== undefined || body.seasonId !== undefined) {
        const sid = body.season_id !== undefined ? body.season_id : body.seasonId;
        if (sid && !(await assertSeasonOwned(supabaseUrl, supabaseKey, businessId, sid))) {
          return json(400, { error: 'Season not found for this business' });
        }
        update.season_id = sid || null;
      }

      const res = await fetch(
        supabaseUrl +
          '/rest/v1/room_rates?id=eq.' +
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
      if (!rows || !rows[0]) return json(404, { error: 'Room rate not found' });
      return json(200, { success: true, data: rows[0] });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('manage-room-rates fatal:', err);
    return json(500, { error: err.message || 'Internal server error' });
  }
};
