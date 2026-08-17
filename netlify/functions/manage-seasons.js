// netlify/functions/manage-seasons.js
// List / create / update / activate-deactivate business_seasons.
// Auth: JWT business_id is authoritative.

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

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return optionsResponse();

  const auth = requireBusinessAuth(event);
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const cfg = supabaseConfig();
  if (!cfg) return json(500, { error: 'Server configuration error' });
  const { supabaseUrl, supabaseKey } = cfg;

  try {
    // GET — list seasons for authenticated business only
    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      if (qs.businessId && qs.businessId !== businessId) {
        return json(403, { error: 'businessId does not match authenticated business' });
      }
      let path =
        'business_seasons?business_id=eq.' +
        encodeURIComponent(businessId) +
        '&order=effective_from.asc';
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

    // POST — create season
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (body.businessId && body.businessId !== businessId) {
        return json(403, { error: 'businessId does not match authenticated business' });
      }
      const name = (body.name || '').trim();
      const effective_from = body.effective_from || body.effectiveFrom;
      const effective_to = body.effective_to || body.effectiveTo;
      if (!name) return json(400, { error: 'name is required' });
      if (!isValidDate(effective_from) || !isValidDate(effective_to)) {
        return json(400, { error: 'effective_from and effective_to must be YYYY-MM-DD' });
      }
      if (effective_from > effective_to) {
        return json(400, { error: 'effective_from must be <= effective_to' });
      }

      // Overlap check against active seasons
      const existingRes = await fetch(
        supabaseUrl +
          '/rest/v1/business_seasons?business_id=eq.' +
          encodeURIComponent(businessId) +
          '&active=eq.true&select=id,name,effective_from,effective_to',
        { headers: restHeaders(supabaseKey) }
      );
      if (existingRes.ok) {
        const existing = await existingRes.json();
        for (const s of existing || []) {
          if (effective_from <= s.effective_to && s.effective_from <= effective_to) {
            return json(409, {
              error:
                'Overlapping active season: "' +
                s.name +
                '" (' +
                s.effective_from +
                '–' +
                s.effective_to +
                ')',
            });
          }
        }
      }

      const insert = {
        business_id: businessId,
        name,
        effective_from,
        effective_to,
        sort_order: body.sort_order != null ? Number(body.sort_order) : 0,
        active: body.active !== false,
      };

      const res = await fetch(supabaseUrl + '/rest/v1/business_seasons', {
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

    // PATCH — update / activate-deactivate
    if (event.httpMethod === 'PATCH' || event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const id = body.id;
      if (!id) return json(400, { error: 'id is required' });

      const update = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) update.name = String(body.name).trim();
      if (body.effective_from !== undefined || body.effectiveFrom !== undefined) {
        update.effective_from = body.effective_from || body.effectiveFrom;
      }
      if (body.effective_to !== undefined || body.effectiveTo !== undefined) {
        update.effective_to = body.effective_to || body.effectiveTo;
      }
      if (body.sort_order !== undefined) update.sort_order = Number(body.sort_order);
      if (body.active !== undefined) update.active = !!body.active;

      if (update.effective_from || update.effective_to) {
        const from = update.effective_from;
        const to = update.effective_to;
        if (from && !isValidDate(from)) return json(400, { error: 'Invalid effective_from' });
        if (to && !isValidDate(to)) return json(400, { error: 'Invalid effective_to' });
        if (from && to && from > to) {
          return json(400, { error: 'effective_from must be <= effective_to' });
        }
      }

      const res = await fetch(
        supabaseUrl +
          '/rest/v1/business_seasons?id=eq.' +
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
      if (!rows || !rows[0]) return json(404, { error: 'Season not found' });
      return json(200, { success: true, data: rows[0] });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('manage-seasons fatal:', err);
    return json(500, { error: err.message || 'Internal server error' });
  }
};
