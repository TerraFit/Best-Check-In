import auth from './_auth.cjs';

const { requireBusinessActor, resolveTenant } = auth;

function response(statusCode, headers, payload) { return { statusCode, headers, body: JSON.stringify(payload) }; }

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return response(405, headers, { error: 'Method Not Allowed' });
  const gate = requireBusinessActor(event);
  if (!gate.ok) return response(gate.status || 401, headers, { success: false, error: gate.error });
  const scope = resolveTenant(gate.principal, event.queryStringParameters?.businessId || null);
  if (!scope.ok) return response(scope.status, headers, { success: false, error: scope.error });
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return response(500, headers, { success: false, error: 'Server configuration error' });
  try {
    const params = new URLSearchParams({ business_id: 'eq.' + scope.businessId, active: 'eq.true', select: '*', order: 'sort_order.asc,name.asc' });
    const res = await fetch(url + '/rest/v1/housekeeping_inventory_items?' + params.toString(), { headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' } });
    if (!res.ok) { console.error('get-housekeeping-inventory failed:', res.status, await res.text()); return response(502, headers, { success: false, error: 'Unable to load inventory catalogue' }); }
    return response(200, headers, { success: true, items: await res.json() });
  } catch (error) { console.error('get-housekeeping-inventory fatal:', error?.message || error); return response(500, headers, { success: false, error: 'Unable to load inventory catalogue' }); }
};
