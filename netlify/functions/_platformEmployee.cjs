const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const PLATFORM_RIGHTS = Object.freeze(['operations','developer','finance','analytics','compliance','support']);
const PLATFORM_POSITIONS = Object.freeze(['general_manager','manager','supervisor','member']);
const PLATFORM_ROLES = Object.freeze(PLATFORM_RIGHTS.map((right) => `platform_${right}`));

const PLATFORM_RIGHT_PERMISSIONS = Object.freeze({
  operations: ['platform:businesses:read','platform:businesses:write','platform:change_requests:read','platform:change_requests:write','platform:subscriptions:read','platform:subscriptions:write','platform:payments:read','platform:audit:read'],
  developer: ['platform:developers:manage','platform:system:diagnostics'],
  finance: ['platform:subscriptions:read','platform:subscriptions:write','platform:payments:read','platform:reports:read','platform:reports:export'],
  analytics: ['platform:analytics:read','platform:analytics:export','platform:reports:read','platform:reports:export'],
  compliance: ['platform:audit:read','platform:compliance:read','platform:reports:read','platform:reports:export'],
  support: ['platform:businesses:read','platform:change_requests:read'],
});

const normalizeEmail = (v) => typeof v === 'string' ? v.trim().toLowerCase() : '';
const normalizeRights = (value) => Array.isArray(value) ? [...new Set(value.filter((right) => PLATFORM_RIGHTS.includes(right)))] : [];
const permissionsForRights = (rights) => [...new Set(normalizeRights(rights).flatMap((right) => PLATFORM_RIGHT_PERMISSIONS[right] || []))];
const hashInvitationToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const createInvitationToken = () => crypto.randomBytes(32).toString('hex');

function publicEmployee(row) {
  return row && {
    id:row.id,
    full_name:row.full_name,
    email:row.email,
    phone:row.phone||null,
    position:row.position||'member',
    rights:normalizeRights(row.rights),
    platform_role:row.platform_role||null,
    status:row.status,
    invited_at:row.invited_at,
    activated_at:row.activated_at||null,
    last_login:row.last_login||null,
    archived_at:row.archived_at||null,
    created_at:row.created_at,
    updated_at:row.updated_at
  };
}

async function restFetch(path, options={}) {
  const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_KEY;
  if(!base||!key) throw new Error('Supabase configuration missing');
  return fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(options.headers||{})}});
}

async function audit(employeeId, actor, action, details={}) {
  try { await restFetch('platform_employee_audit',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({platform_employee_id:employeeId||null,action,actor_id:actor?.userId||null,actor_email:actor?.email||null,details})}); }
  catch(e) { console.error('Platform employee audit write failed:',e?.message||e); }
}

module.exports={PLATFORM_RIGHTS,PLATFORM_POSITIONS,PLATFORM_ROLES,PLATFORM_RIGHT_PERMISSIONS,normalizeEmail,normalizeRights,permissionsForRights,hashInvitationToken,createInvitationToken,publicEmployee,restFetch,audit,bcrypt};
