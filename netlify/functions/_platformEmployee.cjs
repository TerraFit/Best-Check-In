const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const PLATFORM_ROLES = Object.freeze(['platform_operations','platform_developer','platform_finance','platform_analytics','platform_compliance','platform_support']);
const normalizeEmail = (v) => typeof v === 'string' ? v.trim().toLowerCase() : '';
const hashInvitationToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const createInvitationToken = () => crypto.randomBytes(32).toString('hex');
function publicEmployee(row) { return row && { id:row.id, full_name:row.full_name, email:row.email, phone:row.phone||null, platform_role:row.platform_role, status:row.status, invited_at:row.invited_at, activated_at:row.activated_at||null, last_login:row.last_login||null, archived_at:row.archived_at||null, created_at:row.created_at, updated_at:row.updated_at }; }
async function restFetch(path, options={}) { const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_KEY; if(!base||!key) throw new Error('Supabase configuration missing'); return fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(options.headers||{})}}); }
async function audit(employeeId, actor, action, details={}) { try { await restFetch('platform_employee_audit',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({platform_employee_id:employeeId||null,action,actor_id:actor?.userId||null,actor_email:actor?.email||null,details})}); } catch(e) { console.error('Platform employee audit write failed:',e?.message||e); } }
module.exports={PLATFORM_ROLES,normalizeEmail,hashInvitationToken,createInvitationToken,publicEmployee,restFetch,audit,bcrypt};
