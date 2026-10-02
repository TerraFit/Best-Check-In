import auth from './_auth.cjs';
import { buildVisualPdf, textCmd, rectCmd } from './lib/analytics/reportBuilders/simplePdf.js';

const { requireBusinessActor, resolveTenant, requireBusinessPermission } = auth;
const headers = { 'Content-Type': 'application/pdf', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const money = (value, currency='ZAR') => Number(value || 0).toLocaleString('en-ZA', { style:'currency', currency, maximumFractionDigits:2 });
const safe = (value) => String(value || '').replace(/[<>]/g, '');

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers:{...headers,'Content-Type':'application/json'}, body:'' };
  if (event.httpMethod !== 'GET') return { statusCode:405, headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({success:false,error:'Method Not Allowed'}) };
  const gate = requireBusinessActor(event);
  if (!gate.ok) return { statusCode:gate.status || 401, headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({success:false,error:gate.error}) };
  if (!requireBusinessPermission(gate.principal,'canViewHousekeeping')) return { statusCode:403, headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({success:false,error:'Missing permission: canViewHousekeeping'}) };
  const scope = resolveTenant(gate.principal,event.queryStringParameters?.businessId || null);
  if (!scope.ok) return { statusCode:scope.status, headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({success:false,error:scope.error}) };

  const qs=event.queryStringParameters||{};
  const bookingId=qs.bookingId ? String(qs.bookingId) : null;
  const roomId=qs.roomId ? String(qs.roomId) : null;
  const date=qs.date && /^\d{4}-\d{2}-\d{2}$/.test(qs.date) ? qs.date : null;
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)return{statusCode:500,headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({success:false,error:'Server configuration error'})};
  const read={apikey:key,Authorization:'Bearer '+key,Accept:'application/json'},q=encodeURIComponent;
  try{
    const filters=['business_id=eq.'+q(scope.businessId),'order=created_at.asc','select=id,room_id,booking_id,employee_id,item_name_snapshot,category_snapshot,unit_snapshot,quantity_taken,quantity_restocked,unit_price_snapshot,currency,billing_status,created_at'];
    if(bookingId)filters.push('booking_id=eq.'+q(bookingId));
    if(roomId)filters.push('room_id=eq.'+q(roomId));
    if(date){
      const start=new Date(date+'T00:00:00+02:00');
      const end=new Date(start);end.setDate(end.getDate()+1);
      filters.push('created_at=gte.'+q(date+'T00:00:00+02:00'));
      filters.push('created_at=lt.'+q(end.toISOString()));
    }
    const recordsRes=await fetch(url+'/rest/v1/housekeeping_inventory_records?'+filters.join('&'),{headers:read});
    if(!recordsRes.ok)return{statusCode:502,headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({success:false,error:'Unable to load inventory records'})};
    const records=await recordsRes.json();
    const businessRes=await fetch(url+'/rest/v1/businesses?id=eq.'+q(scope.businessId)+'&select=trading_name,registered_name',{headers:read});
    const business=(await businessRes.json())[0]||{};
    const bookings=[...new Set(records.map(r=>r.booking_id).filter(Boolean).map(String))];
    const rooms=[...new Set(records.map(r=>r.room_id).filter(Boolean).map(String))];
    const employees=[...new Set(records.map(r=>r.employee_id).filter(Boolean).map(String))];
    const fetchByIds=async(table,select,ids)=>{if(!ids.length)return[];const r=await fetch(url+'/rest/v1/'+table+'?business_id=eq.'+q(scope.businessId)+'&id=in.('+ids.map(q).join(',')+')&select='+select,{headers:read});if(!r.ok)throw new Error('lookup failed');return r.json();};
    const [bookingRows,roomRows,employeeRows]=await Promise.all([
      fetchByIds('bookings','id,guest_name,guest_first_name,guest_last_name,check_in_date,check_out_date',bookings),
      fetchByIds('rooms','id,room_number,room_name',rooms),
      fetchByIds('employees','id,full_name',employees),
    ]);
    const bm=new Map(bookingRows.map(x=>[String(x.id),x])),rm=new Map(roomRows.map(x=>[String(x.id),x])),em=new Map(employeeRows.map(x=>[String(x.id),x]));
    const enriched=records.map(r=>{const b=bm.get(String(r.booking_id)),room=rm.get(String(r.room_id)),employee=em.get(String(r.employee_id));return{...r,guest_name:b?.guest_name||[b?.guest_first_name,b?.guest_last_name].filter(Boolean).join(' ')||'Guest',room_label:room?.room_number?'Room '+room.room_number:(room?.room_name||'Room'),employee_name:employee?.full_name||'Housekeeping',stay:b?.check_in_date&&b?.check_out_date?b.check_in_date+' → '+b.check_out_date:''};});
    const sales=enriched.reduce((n,r)=>n+Number(r.quantity_taken||0)*Number(r.unit_price_snapshot||0),0);
    const taken=enriched.reduce((n,r)=>n+Number(r.quantity_taken||0),0),restocked=enriched.reduce((n,r)=>n+Number(r.quantity_restocked||0),0);
    const title=bookingId&&enriched[0]?enriched[0].room_label+' — '+enriched[0].guest_name:'Business inventory overview';
    const commands=[rectCmd(0,0,595,842,'#ffffff'),textCmd(safe(business.trading_name||business.registered_name||'Accommodation Business'),50,795,20,'#172033',true),textCmd('Room Amenities Sales — Snapshot',50,770,11,'#f97316',true),textCmd(date||'All recorded dates',430,795,7,'#64748b',true),textCmd(title,50,735,15,'#172033',true)];
    if(enriched[0]?.stay)commands.push(textCmd('Stay: '+enriched[0].stay,50,716,8,'#64748b'));
    commands.push(rectCmd(50,650,150,48,'#f8fafc','#e2e8f0'),rectCmd(215,650,150,48,'#f8fafc','#e2e8f0'),rectCmd(380,650,165,48,'#f8fafc','#e2e8f0'));
    commands.push(textCmd('SALES VALUE',60,678,7,'#64748b',true),textCmd(money(sales,enriched[0]?.currency||'ZAR'),60,658,11,'#172033',true));
    commands.push(textCmd('ITEMS TAKEN',225,678,7,'#64748b',true),textCmd(String(taken),225,658,11,'#172033',true));
    commands.push(textCmd('ITEMS RESTOCKED',390,678,7,'#64748b',true),textCmd(String(restocked),390,658,11,'#172033',true));
    commands.push(textCmd('Amenity',50,625,7,'#64748b',true),textCmd('Room',180,625,7,'#64748b',true),textCmd('Taken',315,625,7,'#64748b',true),textCmd('Restocked',370,625,7,'#64748b',true),textCmd('Sales',455,625,7,'#64748b',true));
    enriched.slice(0,22).forEach((r,i)=>{const y=603-i*22;if(i%2===0)commands.push(rectCmd(50,y-5,495,20,'#f8fafc'));commands.push(textCmd(safe(r.item_name_snapshot),50,y+2,7,'#172033',true),textCmd(safe(r.room_label),180,y+2,7,'#64748b'),textCmd(String(r.quantity_taken||0),315,y+2,7,'#172033'),textCmd(String(r.quantity_restocked||0),390,y+2,7,'#172033'),textCmd(r.quantity_taken>0?money(Number(r.quantity_taken)*Number(r.unit_price_snapshot||0),r.currency):'—',455,y+2,7,'#172033',true));});
    const noteY=Math.max(90,603-Math.min(enriched.length,22)*22-28);
    commands.push(textCmd('Recorded inventory is operational data. FastCheckIn does not post or charge guest folios.',50,noteY,7,'#64748b'),textCmd('Price shown is the catalogue price snapshot recorded with the transaction.',50,noteY-14,7,'#64748b'));
    const pdf=buildVisualPdf([{commands}],{footer:'FastCheckIn · Housekeeping Inventory Snapshot · POPIA Compliant · Confidential'});
    return{statusCode:200,headers,body:pdf.toString('base64'),isBase64Encoded:true};
  }catch(error){console.error('generate-housekeeping-inventory-snapshot fatal:',error?.message||error);return{statusCode:500,headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({success:false,error:'Unable to generate inventory snapshot'})};}
};
