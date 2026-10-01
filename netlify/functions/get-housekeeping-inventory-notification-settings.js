import auth from './_auth.cjs';
const { requireBusinessActor, resolveTenant, requireBusinessPermission } = auth;
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, OPTIONS'};
export const handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers,body:''};
  if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({success:false,error:'Method Not Allowed'})};
  const gate=requireBusinessActor(event);if(!gate.ok)return{statusCode:gate.status||401,headers,body:JSON.stringify({success:false,error:gate.error})};
  if(!requireBusinessPermission(gate.principal,'canViewHousekeeping'))return{statusCode:403,headers,body:JSON.stringify({success:false,error:'Missing permission: canViewHousekeeping'})};
  const scope=resolveTenant(gate.principal,event.queryStringParameters?.businessId||null);if(!scope.ok)return{statusCode:scope.status,headers,body:JSON.stringify({success:false,error:scope.error})};
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;if(!url||!key)return{statusCode:500,headers,body:JSON.stringify({success:false,error:'Server configuration error'})};
  try{
    const r=await fetch(url+'/rest/v1/businesses?id=eq.'+encodeURIComponent(scope.businessId)+'&select=housekeeping_inventory_dashboard_enabled,housekeeping_inventory_email_enabled,housekeeping_inventory_email',{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'}});
    if(!r.ok)return{statusCode:502,headers,body:JSON.stringify({success:false,error:'Unable to load notification settings'})};
    const row=(await r.json())[0];if(!row)return{statusCode:404,headers,body:JSON.stringify({success:false,error:'Business not found'})};
    return{statusCode:200,headers,body:JSON.stringify({success:true,settings:{dashboardEnabled:row.housekeeping_inventory_dashboard_enabled!==false,emailEnabled:row.housekeeping_inventory_email_enabled===true,email:row.housekeeping_inventory_email||''}})};
  }catch(error){console.error('inventory notification settings load:',error?.message||error);return{statusCode:500,headers,body:JSON.stringify({success:false,error:'Unable to load notification settings'})};}
};
