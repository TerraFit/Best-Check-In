import auth from './_auth.cjs';

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;
function response(statusCode, headers, payload) { return { statusCode, headers, body: JSON.stringify(payload) }; }
const clean = (value, fallback='') => String(value ?? fallback).trim();

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return response(405, headers, { error: 'Method Not Allowed' });
  const gate = requireBusinessActor(event); if (!gate.ok) return authFailure(gate, headers);
  if (!requireBusinessPermission(gate.principal, 'canManageSettings')) return authFailure({ status: 403, error: 'Missing permission: canManageSettings' }, headers);
  let body; try { body = JSON.parse(event.body || '{}'); } catch { return response(400, headers, { success:false, error:'Invalid JSON body' }); }
  const scope = resolveTenant(gate.principal, body.businessId || null); if (!scope.ok) return authFailure(scope, headers);
  if (!Array.isArray(body.items)) return response(400, headers, { success:false, error:'items must be an array' });
  if (body.items.length > 200) return response(400, headers, { success:false, error:'Maximum 200 inventory items' });
  const items = body.items.map((item, index) => ({
    ...(item.id ? { id: String(item.id) } : {}), business_id: scope.businessId,
    name: clean(item.name), category: ['minibar','coffee','other'].includes(item.category) ? item.category : 'other',
    unit: clean(item.unit, 'each') || 'each', price: item.price === '' || item.price == null ? null : Number(item.price),
    currency: clean(item.currency, 'ZAR') || 'ZAR', active: item.active !== false, sort_order: Number.isInteger(item.sort_order) ? item.sort_order : index,
    nightbridge_item_id: clean(item.nightbridge_item_id) || null, updated_at: new Date().toISOString()
  }));
  for (const item of items) { if (!item.name) return response(400, headers, { success:false, error:'Inventory item name is required' }); if (item.price != null && (!Number.isFinite(item.price) || item.price < 0)) return response(400, headers, { success:false, error:'Inventory item price must be a non-negative number' }); }
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_KEY; if (!url || !key) return response(500, headers, { success:false, error:'Server configuration error' });
  const read = { apikey:key, Authorization:'Bearer '+key, Accept:'application/json' }, write = { ...read, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=representation' };
  try {
    const deactivate = await fetch(url + '/rest/v1/housekeeping_inventory_items?business_id=eq.' + encodeURIComponent(scope.businessId), { method:'PATCH', headers:write, body:JSON.stringify({ active:false, updated_at:new Date().toISOString() }) });
    if (!deactivate.ok) return response(502, headers, { success:false, error:'Unable to update inventory catalogue' });
    if (items.length) {
      const upsert = await fetch(url + '/rest/v1/housekeeping_inventory_items?on_conflict=id', { method:'POST', headers:write, body:JSON.stringify(items) });
      if (!upsert.ok) { console.error('save-housekeeping-inventory upsert failed:', upsert.status, await upsert.text()); return response(502, headers, { success:false, error:'Unable to save inventory catalogue' }); }
    }
    const finalRes = await fetch(url + '/rest/v1/housekeeping_inventory_items?business_id=eq.' + encodeURIComponent(scope.businessId) + '&active=eq.true&select=*&order=sort_order.asc,name.asc', { headers:read });
    if (!finalRes.ok) return response(502, headers, { success:false, error:'Inventory was saved but could not be reloaded' });
    return response(200, headers, { success:true, items:await finalRes.json() });
  } catch (error) { console.error('save-housekeeping-inventory fatal:', error?.message || error); return response(500, headers, { success:false, error:'Unable to save inventory catalogue' }); }
};
