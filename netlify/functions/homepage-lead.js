import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { supabaseInsert } from './lib/supabase-rest.js';

const MARKETING_BUCKET = 'fastcheckin-marketing';
const SIGNED_URL_EXPIRES_IN = 300;
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);
const escapeHtml = value => clean(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
const jsonResponse = (statusCode, body) => ({ statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) });

async function verifyTurnstile(token, event, expectedAction) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok:false, error:'CAPTCHA is temporarily unavailable. Please try again later.' };
  if (!token || typeof token !== 'string' || token.length > 2048) return { ok:false, error:'Please complete the CAPTCHA verification.' };
  const remoteip = event?.headers?.['x-forwarded-for']?.split(',')[0]?.trim();
  const payload = new URLSearchParams({ secret, response: token });
  if (remoteip) payload.set('remoteip', remoteip);
  if (process.env.TURNSTILE_SITE_KEY) payload.set('sitekey', process.env.TURNSTILE_SITE_KEY);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{ method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:payload.toString(), signal:AbortSignal.timeout(5000) });
    const result = await response.json();
    if (!response.ok || !result.success) {
      console.warn('Turnstile verification failed:', result['error-codes'] || []);
      return { ok:false, error:'CAPTCHA verification failed. Please try again.' };
    }
    const hosts = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || 'fastcheckin.co.za,www.fastcheckin.co.za,fix-turnstile-preview-hostname-diagnostics--fastcheckin.netlify.app').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
    if (!result.hostname || !hosts.includes(String(result.hostname).toLowerCase()) || result.action !== expectedAction) {
      console.warn('Turnstile verification rejected hostname or action:', { hostname: result.hostname || null, action: result.action || null, expectedAction });
      return { ok:false, error:'CAPTCHA verification failed. Please try again.' };
    }
    return { ok:true };
  } catch (error) { console.error('Turnstile verification request failed:',error); return { ok:false, error:'CAPTCHA verification is temporarily unavailable. Please try again.' }; }
}

function validateLead(lead) {
  const fields=['fullName','companyName','email','telephone','address'];
  if (!lead || fields.some(field=>!clean(lead[field]))) return 'Please complete all required fields.';
  if (!/^\S+@\S+\.\S+$/.test(clean(lead.email))) return 'Please enter a valid email address.';
  return null;
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) { console.warn('RESEND_API_KEY is not configured.'); return false; }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({ from:'FastCheckin <notifications@fastcheckin.co.za>', to:Array.isArray(to)?to:[to], subject, html });
    if (result?.error) { console.error('Resend returned an error:',result.error); return false; }
    return true;
  } catch (error) { console.error('Email send failed:',error); return false; }
}

async function notifyLead(lead, document) {
  const labels={brochure:'FastCheckIn Brochure','visitor-origin':'Visitor Origin Explorer Snapshot','business-snapshot':'Business Snapshot'};
  const documentLabel=labels[document] || 'FastCheckIn resource';
  const html='<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>FastCheckIn resource request</h2><p><strong>Resource:</strong> '+documentLabel+'</p><p><strong>Name:</strong> '+escapeHtml(lead.fullName)+'</p><p><strong>Company / hotel:</strong> '+escapeHtml(lead.companyName)+'</p><p><strong>Email:</strong> '+escapeHtml(lead.email)+'</p><p><strong>Telephone:</strong> '+escapeHtml(lead.telephone)+'</p><p><strong>Address:</strong> '+escapeHtml(lead.address)+'</p></div>';
  return sendEmail({ to:process.env.FASTCHECKIN_INQUIRY_EMAIL || 'inquiry@fastcheckin.co.za', subject:'Homepage resource request: '+documentLabel, html });
}

async function sendBrochureThankYou(lead) {
  const brochureUrl='https://fastcheckin.co.za/FastCheckIn_Brochure.html';
  const demoUrl='mailto:inquiry@fastcheckin.co.za?subject=FastCheckIn%20demonstration';
  const callUrl='tel:+27837789487';
  const firstName=clean(lead.fullName).split(/\s+/)[0] || 'there';
  const html=`<div style="margin:0;background:#eef3f4;padding:30px 12px;font-family:Arial,Helvetica,sans-serif;color:#18313c"><div style="max-width:640px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #dce7e7"><div style="background:#082c3a;padding:28px 32px;color:#fff"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c3ec5b;font-weight:bold">Hospitality, connected</div><h1 style="margin:8px 0 0;font-size:30px">Thank you for your interest in FastCheckIn</h1></div><div style="padding:32px"><p>Dear ${escapeHtml(firstName)},</p><p>Thank you for your interest in FastCheckIn. We invite you to explore our platform and see how digital check-in, guest information, operations and business intelligence can work together for your property.</p><p style="margin:26px 0"><a href="${brochureUrl}" style="display:inline-block;background:#a6d631;color:#17333c;text-decoration:none;font-weight:bold;padding:14px 20px;border-radius:8px">View the FastCheckIn brochure</a></p><p>If you would like to see FastCheckIn in action, we would be delighted to arrange a personal demonstration or speak with you about your property and requirements.</p><p style="margin:26px 0"><a href="${demoUrl}" style="display:inline-block;background:#082c3a;color:#fff;text-decoration:none;font-weight:bold;padding:13px 18px;border-radius:8px;margin-right:8px">Book a demonstration</a><a href="${callUrl}" style="display:inline-block;border:1px solid #082c3a;color:#082c3a;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:8px">Request a phone call</a></p><p>We look forward to hearing from you.</p><p style="margin-bottom:0">Kind regards,<br><strong>The FastCheckIn Team</strong><br>Hospitality, connected</p></div><div style="padding:20px 32px;background:#f3f8f7;font-size:12px;color:#60727b">FastCheckIn · Aemara Group Pty Ltd · South Africa<br>inquiry@fastcheckin.co.za · +27 (0)83 778 9487</div></div></div>`;
  return sendEmail({ to:lead.email, subject:'Thank you for your interest in FastCheckIn', html });
}

async function prepareProtectedResource(resource) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('Supabase Storage credentials are not configured.');
  const storageBaseUrl=`${process.env.SUPABASE_URL.replace(/\/$/,'')}/storage/v1`;
  const serviceKey=process.env.SUPABASE_SERVICE_KEY;
  const authHeaders={ Authorization:`Bearer ${serviceKey}`, apikey:serviceKey };
  const objectPath=resource.fileName;
  const objectUrl=`${storageBaseUrl}/object/${MARKETING_BUCKET}/${objectPath}`;
  const root=process.env.LAMBDA_TASK_ROOT || process.cwd();
  const candidates=[path.resolve(process.cwd(),'public',resource.fileName),path.resolve(root,'public',resource.fileName),path.resolve(process.cwd(),resource.fileName),path.resolve(root,resource.fileName)];
  let filePath=null;
  for (const candidate of candidates) { try { await access(candidate); filePath=candidate; break; } catch {} }
  if (!filePath) throw new Error('Protected resource file is unavailable in the deployed function bundle.');
  const file=await readFile(filePath);
  const upload=await fetch(objectUrl,{method:'POST',headers:{...authHeaders,'Content-Type':'application/pdf','Cache-Control':'max-age=3600','x-upsert':'true'},body:file});
  if (!upload.ok) { const details=await upload.text().catch(()=> ''); throw new Error(`Unable to store protected resource: HTTP ${upload.status}${details ? ` — ${details}` : ''}`); }
  const sign=await fetch(`${storageBaseUrl}/object/sign/${MARKETING_BUCKET}/${objectPath}`,{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:SIGNED_URL_EXPIRES_IN})});
  if (!sign.ok) { const details=await sign.text().catch(()=> ''); throw new Error(`Unable to create protected download URL: HTTP ${sign.status}${details ? ` — ${details}` : ''}`); }
  const signed=await sign.json(); const relative=signed?.signedURL || signed?.signedUrl;
  if (!relative) throw new Error('Unable to create protected download URL: missing signed URL');
  const url=new URL(relative.startsWith('http') ? relative : `${storageBaseUrl}${relative.startsWith('/')?'':'/'}${relative}`);
  url.searchParams.set('download','true');
  return url.toString();
}

async function notifyInquiry(lead, topic, comments) {
  const html='<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>FastCheckIn website enquiry</h2><p><strong>Topic:</strong> '+escapeHtml(topic)+'</p><p><strong>Name:</strong> '+escapeHtml(lead.fullName)+'</p><p><strong>Company / hotel:</strong> '+escapeHtml(lead.companyName)+'</p><p><strong>Email:</strong> '+escapeHtml(lead.email)+'</p><p><strong>Telephone:</strong> '+escapeHtml(lead.telephone)+'</p><p><strong>Address:</strong> '+escapeHtml(lead.address)+'</p><p><strong>Comments:</strong><br>'+escapeHtml(comments)+'</p></div>';
  return sendEmail({to:process.env.FASTCHECKIN_INQUIRY_EMAIL || 'inquiry@fastcheckin.co.za',subject:'FastCheckIn website enquiry: '+clean(topic,120),html});
}

const PROTECTED_DOCUMENTS={brochure:{fileName:'FastCheckIn_Platform_Overview_Brochure.pdf'},'visitor-origin':{fileName:'FastCheckIn_Visitor_Origin_Explorer_Snapshot.pdf'},'business-snapshot':{fileName:'FastCheckIn_Business_Snapshot.pdf'}};

export const handler=async event=>{
  if (event.httpMethod==='OPTIONS') return {statusCode:204,headers:JSON_HEADERS,body:''};
  if (event.httpMethod!=='POST') return jsonResponse(405,{error:'Method Not Allowed'});
  let body; try { body=JSON.parse(event.body || '{}'); } catch { return jsonResponse(400,{error:'Invalid JSON body'}); }

  if (body.action==='inquiry' || body.action==='enterprise-inquiry') {
    const captcha=await verifyTurnstile(body.turnstileToken,event,body.action==='enterprise-inquiry'?'enterprise-enquiry':'homepage-enquiry');
    if (!captcha.ok) return jsonResponse(400,{error:captcha.error});
    const leadError=validateLead(body.lead); if (leadError) return jsonResponse(400,{error:leadError});
    const topic=clean(body.topic,160), comments=clean(body.comments,3000); if (!topic || !comments) return jsonResponse(400,{error:'Please select a topic and enter your comments.'});
    const lead={fullName:clean(body.lead.fullName),companyName:clean(body.lead.companyName),email:clean(body.lead.email,320),telephone:clean(body.lead.telephone,80),address:clean(body.lead.address)};
    try {
      const portfolio=body.portfolio && typeof body.portfolio==='object' ? body.portfolio : {};
      await supabaseInsert('website_enquiries',{topic,status:'new',full_name:lead.fullName,company_name:lead.companyName,email:lead.email,telephone:lead.telephone,address:lead.address,website:clean(portfolio.website,500)||null,total_rooms:Number.isFinite(Number(portfolio.totalRooms))?Number(portfolio.totalRooms):null,total_establishments:Number.isFinite(Number(portfolio.totalEstablishments))?Number(portfolio.totalEstablishments):null,sa_establishments:Number.isFinite(Number(portfolio.saEstablishments))?Number(portfolio.saEstablishments):null,sa_provinces:Array.isArray(portfolio.saProvinces)?portfolio.saProvinces.map(v=>clean(v,100)).filter(Boolean):[],international_establishments:Number.isFinite(Number(portfolio.internationalEstablishments))?Number(portfolio.internationalEstablishments):0,international_countries:Array.isArray(portfolio.internationalCountries)?portfolio.internationalCountries.map(v=>clean(v,100)).filter(Boolean):[],comments});
    } catch (error) { console.error('Website enquiry persistence failed:',error); return jsonResponse(500,{error:'Unable to save your enquiry. Please try again.'}); }
    await notifyInquiry(lead,topic,comments);
    return jsonResponse(200,{success:true});
  }

  if (body.action!=='download') return jsonResponse(400,{error:'Unsupported action'});
  const document=['brochure','visitor-origin','business-snapshot'].includes(body.document) ? body.document : null;
  if (!document) return jsonResponse(400,{error:'Unsupported document'});
  const captcha=await verifyTurnstile(body.turnstileToken,event,'homepage-download'); if (!captcha.ok) return jsonResponse(400,{error:captcha.error});
  const leadError=validateLead(body.lead); if (leadError) return jsonResponse(400,{error:leadError});
  const lead={fullName:clean(body.lead.fullName),companyName:clean(body.lead.companyName),email:clean(body.lead.email,320),telephone:clean(body.lead.telephone,80),address:clean(body.lead.address)};
  await notifyLead(lead,document);
  if (document==='brochure') {
    const emailSent=await sendBrochureThankYou(lead);
    return jsonResponse(200,{success:true,brochureUrl:'/FastCheckIn_Brochure.html',emailSent});
  }
  try { const downloadUrl=await prepareProtectedResource(PROTECTED_DOCUMENTS[document]); return jsonResponse(200,{success:true,downloadUrl}); }
  catch (error) { console.error('Protected resource preparation failed:',error); return jsonResponse(500,{error:'Unable to prepare the download. Please try again.'}); }
};
