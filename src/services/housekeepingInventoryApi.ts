import { clearEmployeeAuth, getApiAuthToken } from '../utils/auth';

export interface HousekeepingInventoryItem { id:string; business_id:string; name:string; category:'minibar'|'coffee'|'other'; unit:string; price:number|null; currency:string; active:boolean; sort_order:number; nightbridge_item_id?:string|null; }
export interface HousekeepingInventoryRecordInput { inventoryItemId:string; quantityTaken:number; quantityRestocked:number; notes?:string; clientReference?:string; }
function headers(extra:Record<string,string>={}){const h={...extra};const token=getApiAuthToken();if(token)h.Authorization='Bearer '+token;return h;}
async function json(response:Response){const data=await response.json().catch(()=>({}));if(!response.ok){if(response.status===403&&data.code==='EMPLOYEE_DISABLED'){clearEmployeeAuth();}throw new Error(data.error||data.message||'Inventory request failed');}return data;}
export async function fetchHousekeepingInventory(businessId:string):Promise<HousekeepingInventoryItem[]>{const r=await fetch('/.netlify/functions/get-housekeeping-inventory?businessId='+encodeURIComponent(businessId),{headers:headers()});const d=await json(r);return d.items||[];}
export async function saveHousekeepingInventory(businessId:string,items:Partial<HousekeepingInventoryItem>[]):Promise<HousekeepingInventoryItem[]>{const r=await fetch('/.netlify/functions/save-housekeeping-inventory',{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({businessId,items})});const d=await json(r);return d.items||[];}
export async function recordHousekeepingInventory(businessId:string,sessionId:string,items:HousekeepingInventoryRecordInput[]){const r=await fetch('/.netlify/functions/record-housekeeping-inventory',{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({businessId,sessionId,items})});return json(r);}

export interface HousekeepingInventoryRecord {
  id:string; service_session_id:string; housekeeping_task_id?:string|null; room_id?:string|null; booking_id?:string|null; employee_id?:string|null;
  inventory_item_id?:string|null; item_name_snapshot:string; category_snapshot:string; unit_snapshot:string;
  quantity_taken:number; quantity_restocked:number; unit_price_snapshot:number|null; currency:string; billing_status:string;
  external_system?:string|null; external_item_id?:string|null; external_reference?:string|null; client_reference:string; notes?:string|null; created_at:string;
  room_number?:string|number|null; room_name?:string|null; guest_name?:string|null; check_in_date?:string|null; check_out_date?:string|null;
  employee_name?:string|null; sales_value:number; stay_day:string|null;
}
export interface HousekeepingInventoryNotificationSettings { dashboardEnabled:boolean; emailEnabled:boolean; email:string; }
export async function fetchHousekeepingInventoryRecords(businessId:string,params:{dateFrom?:string;dateTo?:string;roomId?:string;bookingId?:string;limit?:number}={}):Promise<HousekeepingInventoryRecord[]>{
  const qs=new URLSearchParams({businessId});
  Object.entries(params).forEach(([key,value])=>{if(value!==undefined&&value!==null&&value!=='')qs.set(key,String(value));});
  const r=await fetch('/.netlify/functions/get-housekeeping-inventory-records?'+qs.toString(),{headers:headers()});
  const d=await json(r);return d.records||[];
}
export async function fetchHousekeepingInventoryNotificationSettings(businessId:string):Promise<HousekeepingInventoryNotificationSettings>{
  const r=await fetch('/.netlify/functions/get-housekeeping-inventory-notification-settings?businessId='+encodeURIComponent(businessId),{headers:headers()});
  const d=await json(r);return d.settings||{dashboardEnabled:true,emailEnabled:false,email:''};
}
export async function saveHousekeepingInventoryNotificationSettings(businessId:string,settings:HousekeepingInventoryNotificationSettings){
  const r=await fetch('/.netlify/functions/save-housekeeping-inventory-notification-settings',{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({businessId,...settings})});
  return json(r);
}
