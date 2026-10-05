const test=require('node:test');
const assert=require('node:assert/strict');
const jwt=require('jsonwebtoken');
process.env.SUPABASE_JWT_SECRET='test-secret-for-platform-employees';
const auth=require('../_auth.cjs');
const event=(token)=>({headers:{authorization:'Bearer '+token}});
const sign=(payload,opts={})=>jwt.sign(payload,process.env.SUPABASE_JWT_SECRET,{expiresIn:'15m',issuer:'fastcheckin',...opts});
const superToken=()=>sign({sub:'admin-1',email:'admin@example.com',role:'super_admin'},{audience:'super-admin'});

test('platform employee token is a platform actor and has no business scope',()=>{const r=auth.requirePlatformActor(event(sign({sub:'p1',email:'p@example.com',platform_role:'platform_support'})));assert.equal(r.ok,true);assert.equal(r.principal.actorType,'platform');assert.equal(r.principal.businessId,null);assert.equal(r.principal.employeeId,null);});
test('business employee token cannot satisfy SuperAdmin authorization',()=>{const r=auth.requireSuperAdmin(event(sign({sub:'e1',user_metadata:{business_id:'biz',employee_id:'e1',staff_role:'Manager'}})));assert.equal(r.ok,false);assert.equal(r.status,403);});
test('service role cannot be a platform employee identity',()=>{const r=auth.requirePlatformActor(event(sign({sub:'service',role:'service_role'})));assert.equal(r.ok,false);assert.equal(r.status,403);});
test('spoofed super admin metadata cannot elevate platform employee',()=>{const r=auth.requireSuperAdmin(event(sign({sub:'p1',platform_role:'platform_support',user_metadata:{super_admin:true}})));assert.equal(r.ok,false);});
test('SuperAdmin token retains strict audience for platform management',()=>{const r=auth.requireSuperAdmin(event(superToken()));assert.equal(r.ok,true);assert.equal(r.principal.actorType,'super_admin');});
