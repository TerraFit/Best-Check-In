// netlify/functions/export-marketing-contacts.js
// Programme 1: backend feature gate for marketing_export (Growth+)
import { createClient } from '@supabase/supabase-js';
import { assertFeatureAccess } from './lib/featureAccess.js';
import auth from './_auth.cjs';
const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

export const handler = async (event) => {
  const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if (event.httpMethod === 'OPTIONS') return {statusCode:204,headers,body:''};
  if (event.httpMethod !== 'POST') return {statusCode:405,headers,body:JSON.stringify({error:'Method Not Allowed'})};
  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  const principal = authentication.principal;
  const isPlatform = ['super_admin','platform'].includes(principal.actorType);
  if (isPlatform) {
    if (!requirePlatformPermission(principal,'platform:businesses:read')) return authFailure({status:403,error:'Missing permission: platform:businesses:read'},headers);
  } else if (!requireBusinessPermission(principal,'canManageMarketing')) {
    return authFailure({status:403,error:'Missing permission: canManageMarketing'},headers);
  }
  try {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return {statusCode:400,headers,body:JSON.stringify({error:'Invalid JSON body'})}; }
    const scope = resolveTenant(principal, body.businessId || body.business_id);
    if (!scope.ok) return authFailure(scope, headers);
    const businessId = scope.businessId;
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {realtime:{enabled:false}});
    const denied = await assertFeatureAccess(supabase,businessId,'marketing_export');
    if (denied) return {statusCode:denied.statusCode,headers,body:JSON.stringify(denied.body)};
    const {filters} = body;
    let query = supabase.from('bookings').select('guest_first_name,guest_last_name,guest_email,guest_phone,guest_country,marketing_consent,created_at').eq('business_id',businessId);
    if (filters?.marketingConsent === 'subscribed') query=query.eq('marketing_consent',true);
    else if (filters?.marketingConsent === 'no_consent') query=query.eq('marketing_consent',false);
    else if (filters?.marketingConsent !== 'all') query=query.eq('marketing_consent',true);
    if (filters?.dateFrom) query=query.gte('created_at',filters.dateFrom);
    if (filters?.dateTo) query=query.lte('created_at',filters.dateTo);
    if (filters?.country) query=query.eq('guest_country',filters.country);
    const {data,error}=await query;
    if (error) throw error;
    const contacts=(data||[]).map(row=>({firstName:row.guest_first_name||'',lastName:row.guest_last_name||'',email:row.guest_email||'',phone:row.guest_phone||'',country:row.guest_country||''}));
    const quote=(value)=>`"${String(value).replace(/"/g,'""')}"`;
    const csvContent=[['First Name','Last Name','Email','Phone','Country'].join(','),...contacts.map(c=>[quote(c.firstName),quote(c.lastName),quote(c.email),quote(c.phone),quote(c.country)].join(','))].join('\n');
    return {statusCode:200,headers:{...headers,'Content-Type':'text/csv','Content-Disposition':`attachment; filename="marketing-contacts-${new Date().toISOString().split('T')[0]}.csv"`},body:csvContent};
  } catch (error) {
    console.error('Export error:',error?.message||error);
    return {statusCode:500,headers,body:JSON.stringify({error:'Export failed'})};
  }
};
