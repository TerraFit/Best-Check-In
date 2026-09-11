const test=require('node:test');const assert=require('node:assert/strict');const jwt=require('jsonwebtoken');
process.env.SUPABASE_JWT_SECRET='test-secret-for-authoritative-auth';process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_KEY='test-service-key';
const secret=process.env.SUPABASE_JWT_SECRET;const sign=p=>jwt.sign(p,secret,{expiresIn:'15m',issuer:process.env.FASTCHECKIN_JWT_ISSUER||'fastcheckin'});const biz=(id='biz-a',perms)=>sign({sub:`user-${id}`,user_metadata:{business_id:id,...(perms?{employee_id:`emp-${id}`,staff_role:'custom',permission_set:perms}: {})}});const event=(method,path,token,body)=>({httpMethod:method,headers:token?{authorization:`Bearer ${token}`}:{},queryStringParameters:path||{},body:body?JSON.stringify(body):undefined});async function fn(name){return import(`../${name}.js?test=${Date.now()}-${Math.random()}`)}
for(const name of ['get-lost-found-items','get-lost-found-item','get-lost-found-meta','resolve-lost-found-guest'])test(`${name}: anonymous rejected`,async()=>{const{handler}=await fn(name);assert.equal((await handler(event('GET',{businessId:'biz-a'}))).statusCode,401)});
for(const name of ['create-lost-found-item','update-lost-found-item','collect-lost-found-item','contact-lost-found-guest','upload-lost-found-photo','manage-lost-found-meta'])test(`${name}: anonymous rejected`,async()=>{const{handler}=await fn(name);assert.equal((await handler(event('POST',{},null,{businessId:'biz-a',itemId:'x',item_name:'x',name:'x',action:'add_category',images:['bad']}))).statusCode,401)});
for(const name of ['get-lost-found-items','get-lost-found-item','get-lost-found-meta'])test(`${name}: owner cannot substitute tenant`,async()=>{const{handler}=await fn(name);assert.equal((await handler(event('GET',{businessId:'biz-b',itemId:'item-1'},biz('biz-a')))).statusCode,403)});
test('resolve-lost-found-guest: owner cannot substitute tenant',async()=>{const{handler}=await fn('resolve-lost-found-guest');assert.equal((await handler(event('GET',{businessId:'biz-b',roomId:'room-1'},biz('biz-a')))).statusCode,403)});
for(const name of ['update-lost-found-item','collect-lost-found-item','contact-lost-found-guest','upload-lost-found-photo','manage-lost-found-meta'])test(`${name}: owner cannot substitute tenant`,async()=>{const{handler}=await fn(name);assert.equal((await handler(event('POST',{},biz('biz-a'),{businessId:'biz-b',itemId:'item-1',item_name:'x',collected_by_name:'Guest',method:'email',images:['bad'],action:'add_category',name:'Test'}))).statusCode,403)});
test('create-lost-found-item: owner cannot substitute tenant',async()=>{const{handler}=await fn('create-lost-found-item');assert.equal((await handler(event('POST',{},biz('biz-a'),{businessId:'biz-b',item_name:'wallet'}))).statusCode,403)});
test('create-lost-found-item: employee without create permission rejected',async()=>{const{handler}=await fn('create-lost-found-item');assert.equal((await handler(event('POST',{},biz('biz-a',['canViewLostFound']),{businessId:'biz-a',item_name:'wallet'}))).statusCode,403)});
for(const name of ['collect-lost-found-item','contact-lost-found-guest','upload-lost-found-photo'])test(`${name}: employee without edit permission rejected`,async()=>{const{handler}=await fn(name);assert.equal((await handler(event('POST',{},biz('biz-a',['canViewLostFound']),{businessId:'biz-a',itemId:'item-1',collected_by_name:'Guest',images:['bad']}))).statusCode,403)});
test('update-lost-found-item: employee without edit permission rejected',async()=>{const{handler}=await fn('update-lost-found-item');assert.equal((await handler(event('POST',{},biz('biz-a',['canViewLostFound']),{businessId:'biz-a',itemId:'item-1',item_name:'x'}))).statusCode,403)});
test('manage-lost-found-meta: employee without edit permission rejected',async()=>{const{handler}=await fn('manage-lost-found-meta');assert.equal((await handler(event('POST',{},biz('biz-a',['canViewLostFound']),{businessId:'biz-a',action:'add_category',name:'Test'}))).statusCode,403)});
test('update-lost-found-item: archive requires dispose permission',async()=>{const{handler}=await fn('update-lost-found-item');assert.equal((await handler(event('POST',{},biz('biz-a',['canEditLostFound']),{businessId:'biz-a',itemId:'item-1',status:'archived'}))).statusCode,403)});

test('resolve-lost-found-guest: authorized owner resolves by roomId with tenant-bound room and booking lookups',async()=>{
  const{handler}=await fn('resolve-lost-found-guest');
  const token=biz('biz-a');
  const originalFetch=global.fetch;
  const calls=[];
  global.fetch=async(url,opts={})=>{
    calls.push({url:String(url),opts});
    if(String(url).includes('/rest/v1/rooms?')&&String(url).includes('id=eq.room-a'))return new Response(JSON.stringify([{id:'room-a',room_number:'101',name:'Room 101'}]),{status:200});
    if(String(url).includes('/rest/v1/bookings?'))return new Response(JSON.stringify([{
      id:'booking-a',
      guest_name:'Guest A',
      guest_email:'guest@example.com',
      guest_phone:'+27123456789',
      check_in_date:'2026-09-09',
      check_out_date:'2026-09-12',
      booking_reference:'REF-A',
      room_id:'room-a',
      room_number:'101',
      status:'checked_in'
    }]),{status:200});
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try{
    const r=await handler(event('GET',{businessId:'biz-a',roomId:'room-a'},token));
    assert.equal(r.statusCode,200);
    const body=JSON.parse(r.body);
    assert.equal(body.success,true);
    assert.equal(body.guest.guest_name,'Guest A');
    assert.equal(body.guest.booking_id,'booking-a');
    const roomCall=calls.find(c=>c.url.includes('/rest/v1/rooms?'));
    const bookingCall=calls.find(c=>c.url.includes('/rest/v1/bookings?'));
    assert.ok(roomCall);
    assert.match(roomCall.url,/id=eq\.room-a/);
    assert.match(roomCall.url,/business_id=eq\.biz-a/);
    assert.ok(bookingCall);
    assert.match(bookingCall.url,/business_id=eq\.biz-a/);
    assert.match(bookingCall.url,/room_id=eq\.room-a/);
  }finally{global.fetch=originalFetch}
});

test('resolve-lost-found-guest: authorized owner resolves by roomNumber with tenant-bound room lookup',async()=>{
  const{handler}=await fn('resolve-lost-found-guest');
  const originalFetch=global.fetch;
  const calls=[];
  global.fetch=async(url,opts={})=>{
    calls.push(String(url));
    if(String(url).includes('/rest/v1/rooms?')&&String(url).includes('room_number=eq.101'))return new Response(JSON.stringify([{id:'room-a',room_number:'101',room_name:'Room 101'}]),{status:200});
    if(String(url).includes('/rest/v1/bookings?'))return new Response(JSON.stringify([{
      id:'booking-a',guest_name:'Guest A',guest_email:null,guest_phone:null,
      check_in_date:'2026-09-09',check_out_date:'2026-09-10',
      booking_reference:'REF-A',room_id:'room-a',status:'confirmed'
    }]),{status:200});
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try{
    const r=await handler(event('GET',{businessId:'biz-a',roomNumber:'101'},biz('biz-a')));
    assert.equal(r.statusCode,200);
    const body=JSON.parse(r.body);
    assert.equal(body.guest.guest_name,'Guest A');
    const roomCall=calls.find(url=>url.includes('/rest/v1/rooms?'));
    const bookingCall=calls.find(url=>url.includes('/rest/v1/bookings?'));
    assert.match(roomCall,/business_id=eq\.biz-a/);
    assert.match(roomCall,/room_number=eq\.101/);
    assert.match(bookingCall,/business_id=eq\.biz-a/);
    assert.match(bookingCall,/room_id=eq\.room-a/);
  }finally{global.fetch=originalFetch}
});

test('resolve-lost-found-guest: missing tenant-bound room returns 404 without booking fallback',async()=>{
  const{handler}=await fn('resolve-lost-found-guest');
  const originalFetch=global.fetch;
  const calls=[];
  global.fetch=async(url,opts={})=>{
    calls.push(String(url));
    if(String(url).includes('/rest/v1/rooms?'))return new Response(JSON.stringify([]),{status:200});
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try{
    const r=await handler(event('GET',{businessId:'biz-a',roomId:'room-missing'},biz('biz-a')));
    assert.equal(r.statusCode,404);
    assert.equal(calls.length,1);
    assert.equal(calls[0].includes('/rest/v1/bookings?'),false);
    assert.match(calls[0],/business_id=eq\.biz-a/);
    assert.match(calls[0],/id=eq\.room-missing/);
  }finally{global.fetch=originalFetch}
});

test('resolve-lost-found-guest: room lookup failure returns 502 without booking lookup',async()=>{
  const{handler}=await fn('resolve-lost-found-guest');
  const originalFetch=global.fetch;
  const calls=[];
  global.fetch=async(url,opts={})=>{
    calls.push(String(url));
    if(String(url).includes('/rest/v1/rooms?'))return new Response('upstream failure',{status:500});
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try{
    const r=await handler(event('GET',{businessId:'biz-a',roomId:'room-a'},biz('biz-a')));
    assert.equal(r.statusCode,502);
    assert.equal(calls.length,1);
    assert.equal(calls[0].includes('/rest/v1/bookings?'),false);
  }finally{global.fetch=originalFetch}
});

test('resolve-lost-found-guest: booking lookup failure returns 502 after tenant-bound room resolution',async()=>{
  const{handler}=await fn('resolve-lost-found-guest');
  const originalFetch=global.fetch;
  const calls=[];
  global.fetch=async(url,opts={})=>{
    calls.push(String(url));
    if(String(url).includes('/rest/v1/rooms?'))return new Response(JSON.stringify([{id:'room-a',room_number:'101',name:'Room 101'}]),{status:200});
    if(String(url).includes('/rest/v1/bookings?'))return new Response('upstream failure',{status:500});
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try{
    const r=await handler(event('GET',{businessId:'biz-a',roomId:'room-a'},biz('biz-a')));
    assert.equal(r.statusCode,502);
    assert.equal(calls.length,2);
    assert.match(calls[0],/business_id=eq\.biz-a/);
    assert.match(calls[1],/business_id=eq\.biz-a/);
    assert.match(calls[1],/room_id=eq\.room-a/);
  }finally{global.fetch=originalFetch}
});


test('get-lost-found-item: authorized owner keeps item and activity tenant-scoped', async () => {
  const token = biz('biz-a');
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    const value = String(url);
    calls.push({ url: value, method: options.method || 'GET' });

    if (value.includes('/rest/v1/lost_and_found?') &&
        value.includes('id=eq.item-a') &&
        value.includes('business_id=eq.biz-a')) {
      return new Response(JSON.stringify([{
        id: 'item-a',
        business_id: 'biz-a',
        status: 'awaiting_contact',
        item_name: 'Wallet',
        description: 'Black leather wallet',
        guest_name: 'Guest A',
        booking_id: 'booking-a',
        photo_urls: [],
        collection_signature_url: null
      }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (value.includes('/rest/v1/lost_and_found_activity?') &&
        value.includes('item_id=eq.item-a') &&
        value.includes('business_id=eq.biz-a')) {
      return new Response(JSON.stringify([{
        id: 'activity-a',
        item_id: 'item-a',
        business_id: 'biz-a',
        action: 'created',
        created_at: '2026-09-10T06:00:00.000Z'
      }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unexpected fetch: ${value}`);
  };

  try {
    const { handler } = await fn('get-lost-found-item');

    const result = await handler(event(
      'GET',
      { businessId: 'biz-a', itemId: 'item-a' },
      token
    ));

    assert.equal(result.statusCode, 200);

    const body = JSON.parse(result.body);
    assert.equal(body.success, true);
    assert.equal(body.item.id, 'item-a');
    assert.equal(body.item.business_id, 'biz-a');
    assert.equal(body.activity.length, 1);
    assert.equal(body.activity[0].business_id, 'biz-a');

    const itemCall = calls.find(c =>
      c.url.includes('/rest/v1/lost_and_found?')
    );
    const activityCall = calls.find(c =>
      c.url.includes('/rest/v1/lost_and_found_activity?')
    );

    assert.ok(itemCall);
    assert.match(itemCall.url, /id=eq\.item-a/);
    assert.match(itemCall.url, /business_id=eq\.biz-a/);

    assert.ok(activityCall);
    assert.match(activityCall.url, /item_id=eq\.item-a/);
    assert.match(activityCall.url, /business_id=eq\.biz-a/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('get-lost-found-item: cross-tenant item is not accessible and activity is not queried', async () => {
  const token = biz('biz-a');
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    const value = String(url);
    calls.push({ url: value, method: options.method || 'GET' });

    if (value.includes('/rest/v1/lost_and_found?')) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (value.includes('/rest/v1/lost_and_found_activity?')) {
      throw new Error('Activity must never be queried when item is not found');
    }

    throw new Error(`Unexpected fetch: ${value}`);
  };

  try {
    const { handler } = await fn('get-lost-found-item');

    const result = await handler(event(
      'GET',
      { businessId: 'biz-a', itemId: 'item-b' },
      token
    ));

    assert.equal(result.statusCode, 404);

    const itemCall = calls.find(c =>
      c.url.includes('/rest/v1/lost_and_found?')
    );

    assert.ok(itemCall);
    assert.match(itemCall.url, /id=eq\.item-b/);
    assert.match(itemCall.url, /business_id=eq\.biz-a/);
    assert.equal(
      calls.some(c => c.url.includes('/rest/v1/lost_and_found_activity?')),
      false
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('get-lost-found-item: item lookup failure returns 502 without activity lookup', async () => {
  const token = biz('biz-a');
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    const value = String(url);
    calls.push(value);

    if (value.includes('/rest/v1/lost_and_found?')) {
      return new Response('upstream failure', { status: 500 });
    }

    if (value.includes('/rest/v1/lost_and_found_activity?')) {
      throw new Error('Activity must not be queried after item lookup failure');
    }

    throw new Error(`Unexpected fetch: ${value}`);
  };

  try {
    const { handler } = await fn('get-lost-found-item');

    const result = await handler(event(
      'GET',
      { businessId: 'biz-a', itemId: 'item-a' },
      token
    ));

    assert.equal(result.statusCode, 502);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /id=eq\.item-a/);
    assert.match(calls[0], /business_id=eq\.biz-a/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('invalid JWT is rejected rather than fail-open',async()=>{const{handler}=await fn('get-lost-found-item');assert.equal((await handler(event('GET',{businessId:'biz-a',itemId:'item-1'},'not-a-jwt'))).statusCode,401)});

test('update-lost-found-item source enforces explicit workflow transitions',async()=>{const{handler}=await fn('update-lost-found-item');assert.equal(typeof handler,'function');const fs=require('node:fs'),source=fs.readFileSync(path=require('node:path').join(__dirname,'..','update-lost-found-item.js'),'utf8');assert.match(source,/const WORKFLOW_TRANSITIONS =/);assert.match(source,/Invalid Lost & Found status transition/);assert.match(source,/updated_at=eq\.\$\{q\(current\.updated_at\)\}/);assert.match(source,/Booking and room do not match/)});
test('contact-lost-found-guest source constrains methods and terminal states',async()=>{const fs=require('node:fs'),path=require('node:path');const source=fs.readFileSync(path.join(__dirname,'..','contact-lost-found-guest.js'),'utf8');assert.match(source,/const CONTACT_METHODS = new Set/);assert.match(source,/Invalid contact method/);assert.match(source,/const CONTACTABLE_STATUSES = new Set/);assert.match(source,/Guest contact is not allowed for this Lost & Found status/);assert.match(source,/updated_at=eq\.\$\{encodeURIComponent\(item\.updated_at\)\}/)});
test('collect-lost-found-item source constrains collection states and concurrency',async()=>{const fs=require('node:fs'),path=require('node:path');const source=fs.readFileSync(path.join(__dirname,'..','collect-lost-found-item.js'),'utf8');assert.match(source,/const COLLECTABLE_STATUSES = new Set/);assert.match(source,/Lost & Found item is not ready for collection/);assert.match(source,/updated_at=eq\.\$\{encodeURIComponent\(current\.updated_at\)\}/)});
test('upload-lost-found-photo source binds existing uploads to item identity',async()=>{const fs=require('node:fs'),path=require('node:path');const source=fs.readFileSync(path.join(__dirname,'..','upload-lost-found-photo.js'),'utf8');assert.match(source,/const itemId = body\.itemId \|\| body\.item_id \|\| null/);assert.match(source,/id=eq\.\$\{encodeURIComponent\(itemId\)\}&business_id=eq/);assert.match(source,/Upload tag does not match Lost & Found item/)});

test('contact-lost-found-guest: cross-tenant item is not accessible', async () => {
  const token = biz('biz-a');
  const originalFetch = global.fetch;
  const urls = [];
  let patchCalls = 0;

  global.fetch = async (url, options = {}) => {
    const value = String(url);
    urls.push({ url: value, method: options.method || 'GET' });

    if (value.includes('/rest/v1/lost_and_found?')) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if ((options.method || 'GET') === 'PATCH') {
      patchCalls += 1;
      throw new Error('Cross-tenant item must never be patched');
    }

    return new Response('', { status: 201 });
  };

  try {
    const { handler } = await fn('contact-lost-found-guest');

    const result = await handler(event(
      'POST',
      {},
      token,
      {
        businessId: 'biz-a',
        itemId: 'item-b',
        method: 'phone',
        notes: 'Attempted cross-tenant contact'
      }
    ));

    assert.equal(result.statusCode, 404);
    assert.equal(patchCalls, 0);

    const itemLookup = urls.find(
      (request) =>
        request.method === 'GET' &&
        request.url.includes('/rest/v1/lost_and_found?')
    );

    assert.ok(itemLookup);
    assert.match(itemLookup.url, /business_id=eq\.biz-a/);
    assert.match(itemLookup.url, /id=eq\.item-b/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('contact-lost-found-guest: authorized contact remains tenant-scoped', async () => {
  const token = biz('biz-a');
  const originalFetch = global.fetch;
  const requests = [];

  global.fetch = async (url, options = {}) => {
    const value = String(url);
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;

    requests.push({ url: value, method, body });

    if (value.includes('/rest/v1/lost_and_found?') && method === 'GET') {
      return new Response(JSON.stringify([{
        id: 'item-a',
        business_id: 'biz-a',
        status: 'awaiting_contact',
        updated_at: '2026-09-10T06:00:00.000Z',
        tag_number: 'LF-2026-0001',
        item_name: 'Wallet',
        description: 'Black leather wallet',
        guest_name: 'Real Guest',
        guest_email: 'real@example.com',
        booking_id: 'booking-a'
      }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (value.includes('/rest/v1/lost_and_found?') && method === 'PATCH') {
      return new Response(JSON.stringify([{
        id: 'item-a',
        business_id: 'biz-a',
        status: 'guest_contacted',
        updated_at: '2026-09-10T06:01:00.000Z'
      }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (value.includes('/rest/v1/lost_and_found_activity')) {
      return new Response(JSON.stringify([{
        id: 'activity-a',
        business_id: 'biz-a',
        item_id: 'item-a',
        event_type: 'guest_contacted'
      }]), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (value.includes('/rest/v1/audit_logs')) {
      return new Response('', { status: 201 });
    }

    return new Response('', { status: 201 });
  };

  try {
    const { handler } = await fn('contact-lost-found-guest');

    const result = await handler(event(
      'POST',
      {},
      token,
      {
        businessId: 'biz-a',
        itemId: 'item-a',
        method: 'phone',
        outcome: 'guest_reached',
        notes: 'Guest contacted successfully'
      }
    ));

    assert.equal(result.statusCode, 200);

    const itemLookup = requests.find(
      (request) =>
        request.method === 'GET' &&
        request.url.includes('/rest/v1/lost_and_found?')
    );

    const itemPatch = requests.find(
      (request) =>
        request.method === 'PATCH' &&
        request.url.includes('/rest/v1/lost_and_found?')
    );

    const activityInsert = requests.find(
      (request) =>
        request.method === 'POST' &&
        request.url.includes('/rest/v1/lost_and_found_activity')
    );

    const auditInsert = requests.find(
      (request) =>
        request.method === 'POST' &&
        request.url.includes('/rest/v1/audit_logs')
    );

    assert.ok(itemLookup);
    assert.ok(itemPatch);
    assert.ok(activityInsert);
    assert.ok(auditInsert);

    assert.match(itemLookup.url, /business_id=eq\.biz-a/);
    assert.match(itemLookup.url, /id=eq\.item-a/);

    assert.match(itemPatch.url, /business_id=eq\.biz-a/);
    assert.match(itemPatch.url, /id=eq\.item-a/);
    assert.match(itemPatch.url, /status=eq\.awaiting_contact/);
    assert.match(
      itemPatch.url,
      /updated_at=eq\.2026-09-10T06%3A00%3A00\.000Z/
    );

    assert.equal(activityInsert.body[0].business_id, 'biz-a');
    assert.equal(activityInsert.body[0].item_id, 'item-a');

    assert.equal(auditInsert.body[0].business_id, 'biz-a');
    assert.equal(auditInsert.body[0].details.item_id, 'item-a');
  } finally {
    global.fetch = originalFetch;
  }
});
