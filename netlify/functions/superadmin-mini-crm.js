import auth from './_auth.cjs';
import { supabaseFetch, supabaseInsert, supabaseUpdate, supabaseDelete } from './lib/supabase-rest.js';

const { authenticateRequest, requirePlatformPermission, authFailure } = auth;
const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS'};
const STATUSES = new Set(['new','open_not_contacted','in_progress','attempted_to_contact','connected_bad_timing','qualified','unqualified','converted']);
function json(statusCode, body){return {statusCode,headers,body:JSON.stringify(body)};}
function requireWrite(principal){return requirePlatformPermission(principal,'platform:website_enquiries:write')?null:authFailure({status:403,error:'Missing permission: platform:website_enquiries:write'},headers);}
export const handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return json(204,{});
 const authentication=authenticateRequest(event);
 if(!authentication.ok)return authFailure(authentication,headers);
 if(!requirePlatformPermission(authentication.principal,'platform:website_enquiries:read'))return authFailure({status:403,error:'Missing permission: platform:website_enquiries:read'},headers);
 try{
  if(event.httpMethod==='GET'){
   const query=event.queryStringParameters||{};
   if(query.enquiryId){
    const activities=await supabaseFetch('website_enquiry_activities?enquiry_id=eq.'+encodeURIComponent(query.enquiryId)+'&select=*&order=created_at.desc');
    return json(200,{success:true,activities:activities||[]});
   }
   const parts=['select=*'];
   if(query.status&&STATUSES.has(query.status))parts.push('status=eq.'+encodeURIComponent(query.status));
   if(query.employeeId==='unassigned')parts.push('assigned_employee_id=is.null'); else if(query.employeeId)parts.push('assigned_employee_id=eq.'+encodeURIComponent(query.employeeId));
   if(query.from)parts.push('created_at=gte.'+encodeURIComponent(query.from));
   if(query.to)parts.push('created_at=lte.'+encodeURIComponent(query.to));
   if(query.topic)parts.push('topic=eq.'+encodeURIComponent(query.topic));
   if(query.status==='archived'||query.archived==='true')parts.push('archived_at=not.is.null'); else parts.push('archived_at=is.null');
   parts.push('order=created_at.desc');
   const enquiries=await supabaseFetch('website_enquiries?'+parts.join('&'));
   const employees=await supabaseFetch('platform_employees?select=id,full_name,email,role,active&active=eq.true&order=full_name.asc');
   return json(200,{success:true,data:enquiries||[],employees:employees||[]});
  }
  const writeFailure=requireWrite(authentication.principal); if(writeFailure)return writeFailure;
  let body={}; try{body=event.body?JSON.parse(event.body):{};}catch{return json(400,{success:false,error:'Invalid JSON body'});}
  const id=String(body.id||'').trim(); if(!id)return json(400,{success:false,error:'Inquiry ID is required'});
  if(event.httpMethod==='PATCH'){
   const current=(await supabaseFetch('website_enquiries?id=eq.'+encodeURIComponent(id)+'&select=id,status,assigned_employee_id,assigned_employee_name'))[0];
   if(!current)return json(404,{success:false,error:'Inquiry not found'});
   const updates={updated_at:new Date().toISOString()};
   if(body.status!==undefined){const s=String(body.status);if(!STATUSES.has(s))return json(400,{success:false,error:'Invalid inquiry status'});updates.status=s;}
   if(body.takeover===true){
    const actorEmail=authentication.principal.email;
    if(!actorEmail)return json(403,{success:false,error:'Authenticated platform identity has no email'});
    let emp=(await supabaseFetch('platform_employees?email=eq.'+encodeURIComponent(actorEmail)+'&active=eq.true&select=id,full_name,email,role'))[0];
    if(!emp){
      const actorName=authentication.principal.actorType==='super_admin'?'Super Administrator':actorEmail;
      const created=await supabaseInsert('platform_employees',{full_name:actorName,email:actorEmail,role:authentication.principal.role||'platform',active:true});
      emp=created?.[0]||created;
    }
    if(!emp?.id)return json(500,{success:false,error:'Could not resolve current platform employee'});
    updates.assigned_employee_id=emp.id;
    updates.assigned_employee_name=emp.full_name;
    updates.assigned_at=new Date().toISOString();
   } else if(body.assignedEmployeeId!==undefined){
    if(body.assignedEmployeeId===null||body.assignedEmployeeId===''){updates.assigned_employee_id=null;updates.assigned_employee_name=null;updates.assigned_at=null;}
    else{const eid=String(body.assignedEmployeeId);const emp=(await supabaseFetch('platform_employees?id=eq.'+encodeURIComponent(eid)+'&active=eq.true&select=id,full_name,email,role'))[0];if(!emp)return json(400,{success:false,error:'Active platform employee not found'});updates.assigned_employee_id=emp.id;updates.assigned_employee_name=emp.full_name;updates.assigned_at=new Date().toISOString();}
   }
   if(body.archived===true){const resultingStatus=updates.status||current.status;if(!['unqualified','converted'].includes(resultingStatus))return json(400,{success:false,error:'Only disqualified or converted enquiries can be archived'});updates.archived_at=new Date().toISOString();updates.archived_by=authentication.principal.email||authentication.principal.userId||'super-admin';}
   else if(body.archived===false){updates.archived_at=null;updates.archived_by=null;}
   const data=await supabaseUpdate('website_enquiries',id,updates);
   if(body.takeover===true&&updates.assigned_employee_id)await supabaseInsert('website_enquiry_activities',{enquiry_id:id,employee_id:updates.assigned_employee_id,employee_name:updates.assigned_employee_name,activity_type:'note',comment:'Inquiry taken over by '+updates.assigned_employee_name+'.'});
   return json(200,{success:true,data});
  }
  if(event.httpMethod==='POST'){
   const eid=body.employeeId?String(body.employeeId):null;
   const emp=eid?(await supabaseFetch('platform_employees?id=eq.'+encodeURIComponent(eid)+'&active=eq.true&select=id,full_name'))[0]:null;
   if(eid&&!emp)return json(400,{success:false,error:'Active platform employee not found'});
   const comment=String(body.comment||'').trim();if(!comment)return json(400,{success:false,error:'Comment is required'});
   const activityType=['comment','call','email','meeting','note'].includes(body.activityType)?body.activityType:'comment';
   const data=await supabaseInsert('website_enquiry_activities',{enquiry_id:id,employee_id:emp?.id||null,employee_name:emp?.full_name||authentication.principal.email||'Super Admin',activity_type:activityType,comment});
   return json(201,{success:true,data:data?.[0]||data});
  }
  if(event.httpMethod==='DELETE'){await supabaseDelete('website_enquiries',id);return json(200,{success:true});}
  return json(405,{success:false,error:'Method Not Allowed'});
 }catch(error){console.error('SuperAdmin mini CRM operation failed:',error?.message||error);return json(500,{success:false,error:'Internal server error'});}
};
