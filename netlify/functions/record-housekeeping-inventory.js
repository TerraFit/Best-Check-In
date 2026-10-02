import auth from './_auth.cjs';
import { Resend } from 'resend';

const { requireBusinessActor, resolveTenant, requirePermission } = auth;
function response(statusCode, headers, payload) { return { statusCode, headers, body: JSON.stringify(payload) }; }
function allowed(principal) { return principal.actorType === 'business' || requirePermission(principal, 'canStartHousekeepingTask') || requirePermission(principal, 'canCompleteHousekeepingTask') || requirePermission(principal, 'canManageHousekeeping'); }

export const handler = async (event) => {
  const headers = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type, Authorization', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers, body:'' };
  if (event.httpMethod !== 'POST') return response(405, headers, { error:'Method Not Allowed' });
  let body; try { body=JSON.parse(event.body||'{}'); } catch { return response(400,headers,{success:false,error:'Invalid JSON body'}); }
  const gate=requireBusinessActor(event); if(!gate.ok)return response(gate.status||401,headers,{success:false,error:gate.error});
  if(!allowed(gate.principal))return response(403,headers,{success:false,error:'Missing housekeeping permission'});
  if(!body.sessionId || !Array.isArray(body.items) || !body.items.length)return response(400,headers,{success:false,error:'sessionId and at least one inventory item are required'});
  const scope=resolveTenant(gate.principal,body.businessId||null); if(!scope.ok)return response(scope.status,headers,{success:false,error:scope.error});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY; if(!url||!key)return response(500,headers,{success:false,error:'Server configuration error'});
  const read={apikey:key,Authorization:'Bearer '+key,Accept:'application/json'}, write={...read,'Content-Type':'application/json',Prefer:'return=representation'}; const q=encodeURIComponent;
  try {
    const sessionRes=await fetch(url+'/rest/v1/housekeeping_service_sessions?id=eq.'+q(body.sessionId)+'&business_id=eq.'+q(scope.businessId)+'&select=id,business_id,housekeeping_task_id,room_id,booking_id,employee_id,status', {headers:read});
    if(!sessionRes.ok)return response(502,headers,{success:false,error:'Unable to verify housekeeping service session'});
    const session=(await sessionRes.json())[0]; if(!session)return response(404,headers,{success:false,error:'Housekeeping service session not found'});
    if(session.status!=='active' && gate.principal.actorType!=='business')return response(409,headers,{success:false,error:'Inventory can only be recorded during an active housekeeping service'});
    if(gate.principal.actorType==='employee' && String(session.employee_id)!==String(gate.principal.employeeId))return response(403,headers,{success:false,error:'Forbidden: service session belongs to another employee'});
    const ids=body.items.map(x=>String(x.inventoryItemId||'')).filter(Boolean); if(!ids.length)return response(400,headers,{success:false,error:'Inventory item ids are required'});
    const itemRes=await fetch(url+'/rest/v1/housekeeping_inventory_items?business_id=eq.'+q(scope.businessId)+'&active=eq.true&id=in.('+ids.map(q).join(',')+')&select=*', {headers:read});
    if(!itemRes.ok)return response(502,headers,{success:false,error:'Unable to load inventory items'});
    const catalogue=await itemRes.json(); const byId=new Map(catalogue.map(x=>[String(x.id),x]));
    const rows=[]; for(const entry of body.items){const item=byId.get(String(entry.inventoryItemId||'')); if(!item) return response(400,headers,{success:false,error:'Inventory item is not valid for this business'}); const taken=Math.max(0,Math.floor(Number(entry.quantityTaken)||0)),restocked=Math.max(0,Math.floor(Number(entry.quantityRestocked)||0)); if(!taken&&!restocked)continue; rows.push({business_id:scope.businessId,service_session_id:session.id,housekeeping_task_id:session.housekeeping_task_id||null,room_id:session.room_id||null,booking_id:session.booking_id||null,employee_id:session.employee_id||null,inventory_item_id:item.id,item_name_snapshot:item.name,category_snapshot:item.category,unit_snapshot:item.unit,quantity_taken:taken,quantity_restocked:restocked,unit_price_snapshot:item.price,currency:item.currency||'ZAR',billing_status:'not_applicable',external_system:null,external_item_id:item.nightbridge_item_id||null,client_reference:entry.clientReference||crypto.randomUUID(),notes:entry.notes||null});}
    if(!rows.length)return response(400,headers,{success:false,error:'At least one quantity must be greater than zero'});
    const insert=await fetch(url+'/rest/v1/housekeeping_inventory_records',{method:'POST',headers:write,body:JSON.stringify(rows)}); if(!insert.ok){console.error('record-housekeeping-inventory insert failed:',insert.status,await insert.text());return response(502,headers,{success:false,error:'Unable to save inventory record'});}
    const insertedRecords=await insert.json();

    // Email notification is deliberately best-effort: inventory must remain saved even
    // if the mail provider is unavailable. One message summarizes the whole recording.
    try {
      const businessRes=await fetch(url+'/rest/v1/businesses?id=eq.'+q(scope.businessId)+'&select=trading_name,housekeeping_inventory_email_enabled,housekeeping_inventory_email',{headers:read});
      const business=(await businessRes.json())[0];
      if(business?.housekeeping_inventory_email_enabled && business.housekeeping_inventory_email && process.env.RESEND_API_KEY){
        const total=rows.reduce((sum,row)=>sum+Number(row.quantity_taken||0)*Number(row.unit_price_snapshot||0),0);
        const lines=rows.map(row=>'<li>'+String(row.item_name_snapshot).replace(/[<>]/g,'')+' — taken '+row.quantity_taken+', restocked '+row.quantity_restocked+(row.quantity_taken?' — '+Number(row.quantity_taken*Number(row.unit_price_snapshot||0)).toLocaleString('en-ZA',{style:'currency',currency:row.currency||'ZAR'}):'')+'</li>').join('');
        const resend=new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from:'FastCheckIn <onboarding@resend.dev>',
          to:[business.housekeeping_inventory_email],
          subject:'Housekeeping inventory recorded — '+(business.trading_name||'FastCheckIn'),
          html:'<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px"><h2>Housekeeping inventory recorded</h2><p>The following amenity activity was recorded during a housekeeping service:</p><ul>'+lines+'</ul><p><strong>Recorded value: '+total.toLocaleString('en-ZA',{style:'currency',currency:rows[0]?.currency||'ZAR'})+'</strong></p><p style="color:#64748b;font-size:13px">This is an operational inventory notification. FastCheckIn has not charged the guest or posted a folio transaction.</p></div>'
        });
      }
    } catch(emailError) {
      console.error('housekeeping inventory email notification failed:',emailError?.message||emailError);
    }

    return response(200,headers,{success:true,records:insertedRecords});
  }catch(error){console.error('record-housekeeping-inventory fatal:',error?.message||error);return response(500,headers,{success:false,error:'Unable to save inventory record'});}
};
