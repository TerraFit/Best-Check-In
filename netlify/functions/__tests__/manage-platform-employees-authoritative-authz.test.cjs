const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../manage-platform-employees.js'),'utf8');
test('platform employee management is SuperAdmin-only',()=>{assert.match(source,/requireSuperAdmin\(event\)/);assert.doesNotMatch(source,/requirePlatformActor\(event\)/);});
test('platform employee management has no permanent delete action',()=>{assert.doesNotMatch(source,/event\.httpMethod==='DELETE'/);assert.match(source,/action==='archive'/);assert.match(source,/action==='restore'/);});
test('platform employee API does not expose password or invitation secrets',()=>{assert.match(source,/publicEmployee/);assert.doesNotMatch(source,/select=id,full_name,email,phone,platform_role,status,password_hash/);});
