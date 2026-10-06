import auth from './_auth.cjs';
import { PLATFORM_RIGHTS, PLATFORM_POSITIONS, normalizeEmail, normalizeRights, hashInvitationToken, createInvitationToken, publicEmployee, restFetch, audit } from './_platformEmployee.cjs';
const { requireSuperAdmin, authFailure } = auth;
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS'};
const json=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});

async function responseError(response){
  let detail='';
  try{detail=(await response.text()).slice(0,2000)}catch{}
  return {status:response.status,statusText:response.statusText,detail};
}

async function sendInvitationEmail(employee,token){
  if(!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');
  const {Resend}=await import('resend');
  const resend=new Resend(process.env.RESEND_API_KEY);
  const origin=(process.env.URL||'https://fastcheckin.co.za').replace(/\/$/,'');
  const link=origin+'/platform/employee/invite/'+encodeURIComponent(token);
  const result=await resend.emails.send({
    from:'FastCheckIn <notifications@fastcheckin.co.za>',
    to:[employee.email],
    subject:'Your FastCheckIn platform employee invitation',
    html:'<div style="font-family:Arial,sans-serif;line-height:1.5"><p>Hello '+employee.full_name+',</p><p>You have been invited to join the FastCheckIn internal platform team.</p><p><strong>Position:</strong> '+String(employee.position||'member').replace(/_/g,' ')+'</p><p><a href="'+link+'">Activate your FastCheckIn account</a></p><p>This invitation expires in 7 days.</p></div>'
  });
  if(result?.error) throw new Error(result.error.message||'Invitation email failed');
  console.info('Platform invitation email accepted by Resend', {employeeId:employee.id, emailId:result?.data?.id || null, to:employee.email});
  return result?.data?.id || null;
}

export const handler=async(event)=>{
  if(event.httpMethod==='OPTIONS') return json(204,{});
  const ar=requireSuperAdmin(event);
  if(!ar.ok) return authFailure(ar,headers);
  try {
    if(event.httpMethod==='GET'){
      const s=event.queryStringParameters?.status;
      const filter=['Invited','Active','Archived'].includes(s||'')?'&status=eq.'+encodeURIComponent(s):'';
      const r=await restFetch('platform_employees?select=id,full_name,email,phone,position,rights,platform_role,status,invited_at,activated_at,last_login,archived_at,created_at,updated_at&order=created_at.desc'+filter);
      if(!r.ok){const err=await responseError(r);console.error('Platform employee GET failed:',err);return json(500,{success:false,error:'Failed to fetch platform employees'});}
      return json(200,{success:true,data:(await r.json()).map(publicEmployee)});
    }

    if(event.httpMethod==='POST'){
      let b; try{b=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON'})}
      const full_name=typeof b.full_name==='string'?b.full_name.trim():'';
      const email=normalizeEmail(b.email);
      const phone=typeof b.phone==='string'?b.phone.trim()||null:null;
      const position=PLATFORM_POSITIONS.includes(b.position)?b.position:'member';
      const rights=normalizeRights(b.rights);
      if(!full_name||!email||rights.length===0)return json(400,{error:'Full name, email and at least one platform right are required'});
      if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return json(400,{error:'Valid email address required'});
      const ex=await restFetch('platform_employees?email=eq.'+encodeURIComponent(email)+'&select=id,full_name,status&limit=1');
      if(!ex.ok){const err=await responseError(ex);console.error('Platform employee duplicate check failed:',err);return json(500,{error:'Failed to check existing platform employee'});}
      const existing=(await ex.json())?.[0];
      if(existing)return json(409,{error:`A platform employee with this email already exists (${existing.status}). Use the existing employee record or restore it if archived.`});
      const token=createInvitationToken(), now=new Date(), expiry=new Date(now.getTime()+604800000);
      const legacyRole=rights.length===1?'platform_'+rights[0]:null;
      const r=await restFetch('platform_employees',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({full_name,email,phone,position,rights,platform_role:legacyRole,status:'Invited',invitation_token_hash:hashInvitationToken(token),invitation_expires_at:expiry.toISOString(),invited_at:now.toISOString(),invited_by:ar.principal.userId,updated_at:now.toISOString()})});
      if(!r.ok){const err=await responseError(r);console.error('Platform employee create failed:',err);return json(500,{error:'Failed to create platform employee'});}
      const employee=(await r.json())?.[0];
      try{
        const emailId=await sendInvitationEmail(employee,token);
        await audit(employee.id,ar.principal,'invited',{position,rights,email_id:emailId});
        return json(201,{success:true,data:publicEmployee(employee),email_id:emailId});
      }catch(e){
        await restFetch('platform_employees?id=eq.'+encodeURIComponent(employee.id),{method:'DELETE'}).catch(()=>{});
        console.error('Platform invitation email failed:',e?.message||e);
        return json(502,{error:'Employee was not created because the invitation email could not be sent'});
      }
    }

    if(event.httpMethod==='PATCH'){
      let b; try{b=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON'})}
      const id=typeof b.id==='string'?b.id:'';
      if(!id)return json(400,{error:'Employee ID required'});
      if(b.position!==undefined&&!PLATFORM_POSITIONS.includes(b.position))return json(400,{error:'Invalid position'});
      if(b.rights!==undefined&&normalizeRights(b.rights).length===0)return json(400,{error:'At least one platform right is required'});
      const cr=await restFetch('platform_employees?id=eq.'+encodeURIComponent(id)+'&select=*');
      if(!cr.ok){const err=await responseError(cr);console.error('Platform employee load for PATCH failed:',err);return json(500,{error:'Failed to load platform employee'});}
      const current=(await cr.json())?.[0];
      if(!current)return json(404,{error:'Platform employee not found'});
      const updates={updated_at:new Date().toISOString()};
      if(typeof b.full_name==='string'&&b.full_name.trim())updates.full_name=b.full_name.trim();
      if(typeof b.phone==='string')updates.phone=b.phone.trim()||null;
      if(b.position!==undefined)updates.position=b.position;
      if(b.rights!==undefined){updates.rights=normalizeRights(b.rights);updates.platform_role=updates.rights.length===1?'platform_'+updates.rights[0]:null;}
      if(b.action==='archive'){
        if(current.status==='Archived')return json(409,{error:'Employee is already archived'});
        updates.status='Archived';updates.archived_at=new Date().toISOString();updates.archived_by=ar.principal.userId;updates.invitation_token_hash=null;updates.invitation_expires_at=null;
      } else if(b.action==='restore'){
        if(current.status!=='Archived')return json(409,{error:'Employee is not archived'});
        updates.status=current.password_hash?'Active':'Invited';updates.archived_at=null;updates.archived_by=null;
      } else if(b.action==='resend'){
        if(current.status!=='Invited')return json(409,{error:'Only invited employees can receive a new invitation'});
        const token=createInvitationToken(),expiry=new Date(Date.now()+604800000);
        updates.invitation_token_hash=hashInvitationToken(token);updates.invitation_expires_at=expiry.toISOString();
        const ur=await restFetch('platform_employees?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(updates)});
        if(!ur.ok){const err=await responseError(ur);console.error('Platform invitation refresh failed:',err);return json(500,{error:'Failed to refresh invitation'});}
        const row=(await ur.json())?.[0]||current;
        try{const emailId=await sendInvitationEmail(row,token);await audit(id,ar.principal,'invitation_resent',{email_id:emailId});return json(200,{success:true,data:publicEmployee(row),email_id:emailId});}
        catch(e){console.error('Platform invitation resend failed:',e?.message||e);return json(502,{error:'Invitation email could not be sent'});}
      }
      const ur=await restFetch('platform_employees?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(updates)});
      if(!ur.ok){const err=await responseError(ur);console.error('Platform employee update failed:',{employeeId:id,updates,error:err});return json(500,{error:'Failed to update platform employee',detail:err.detail||undefined});}
      const row=(await ur.json())?.[0];
      await audit(id,ar.principal,b.action||'updated',{fields:Object.keys(updates).filter(k=>k!=='updated_at')});
      return json(200,{success:true,data:publicEmployee(row)});
    }
    return json(405,{error:'Method not allowed'});
  }catch(e){console.error('manage-platform-employees fatal:',e?.message||e);return json(500,{error:'Internal server error'});}
};
