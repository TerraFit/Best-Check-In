// netlify/functions/manage-rate-provider-mappings.js
// List / create / update rate_provider_mappings.

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
        'rate_provider_mappings?business_id=eq.' +
        encodeURIComponent(businessId) +
        '&order=created_at.desc';
      if (qs.provider) path += '&provider=eq.' + encodeURIComponent(qs.provider);
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

      const provider = (body.provider || '').trim();
      const internal_room_id = body.internal_room_id || body.internalRoomId;
      const external_room_id = body.external_room_id || body.externalRoomId;
      const external_room_name =
        body.external_room_name != null
          ? body.external_room_name
          : body.externalRoomName != null
            ? body.externalRoomName
            : null;

      if (!provider) return json(400, { error: 'provider is required' });
      if (!internal_room_id) return json(400, { error: 'internal_room_id is required' });
      if (!external_room_id) return json(400, { error: 'external_room_id is required' });

      if (!(await assertRoomOwned(supabaseUrl, supabaseKey, businessId, internal_room_id))) {
        return json(400, { error: 'Room not found for this business' });
      }

      const insert = {
        business_id: businessId,
        provider,
        internal_room_id,
        external_room_id: String(external_room_id),
        external_room_name,
        active: body.active !== false,
      };

      const res = await fetch(supabaseUrl + '/rest/v1/rate_provider_mappings', {
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
      if (body.external_room_id !== undefined || body.externalRoomId !== undefined) {
        update.external_room_id = String(body.external_room_id || body.externalRoomId);
      }
      if (body.external_room_name !== undefined || body.externalRoomName !== undefined) {
        update.external_room_name =
          body.external_room_name !== undefined ? body.external_room_name : body.externalRoomName;
      }
      if (body.active !== undefined) update.active = !!body.active;
      if (body.provider !== undefined) update.provider = String(body.provider).trim();

      const res = await fetch(
        supabaseUrl +
          '/rest/v1/rate_provider_mappings?id=eq.' +
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
      if (!rows || !rows[0]) return json(404, { error: 'Provider mapping not found' });
      return json(200, { success: true, data: rows[0] });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('manage-rate-provider-mappings fatal:', err);
    return json(500, { error: err.message || 'Internal server error' });
  }
};
