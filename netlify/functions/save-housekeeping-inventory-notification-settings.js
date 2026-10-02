import auth from './_auth.cjs';
const { requireBusinessActor, resolveTenant, requireBusinessPermission } = auth;
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'};
export const handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers,body:''};
  if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({success:false,error:'Method Not Allowed'})};
  const gate=requireBusinessActor(event);if(!gate.ok)return{statusCode:gate.status||401,headers,body:JSON.stringify({success:false,error:gate.error})};
  if(!requireBusinessPermission(gate.principal,'canManageSettings'))return{statusCode:403,headers,body:JSON.stringify({success:false,error:'Missing permission: canManageSettings'})};
  let body;try{body=JSON.parse(event.body||'{}')}catch{return{statusCode:400,headers,body:JSON.stringify({success:false,error:'Invalid JSON body'})}};
  const scope=resolveTenant(gate.principal,body.businessId||null);if(!scope.ok)return{statusCode:scope.status,headers,body:JSON.stringify({success:false,error:scope.error})};
  const dashboardEnabled=body.dashboardEnabled!==false,emailEnabled=body.emailEnabled===true,email=typeof body.email==='string'?body.email.trim():'';
  if(emailEnabled&&(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return{statusCode:400,headers,body:JSON.stringify({success:false,error:'A valid email address is required when email notifications are enabled'})};
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;if(!url||!key)return{statusCode:500,headers,body:JSON.stringify({success:false,error:'Server configuration error'})};
  try{
    const r=await fetch(url+'/rest/v1/businesses?id=eq.'+encodeURIComponent(scope.businessId),{method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({housekeeping_inventory_dashboard_enabled:dashboardEnabled,housekeeping_inventory_email_enabled:emailEnabled,housekeeping_inventory_email:email||null})});
    if(!r.ok){console.error('inventory notification settings save:',r.status,await r.text());return{statusCode:502,headers,body:JSON.stringify({success:false,error:'Unable to save notification settings'})};}
    return{statusCode:200,headers,body:JSON.stringify({success:true,settings:{dashboardEnabled,emailEnabled,email}})};
  }catch(error){console.error('inventory notification settings save fatal:',error?.message||error);return{statusCode:500,headers,body:JSON.stringify({success:false,error:'Unable to save notification settings'})};}
};
