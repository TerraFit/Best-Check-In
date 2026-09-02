import auth from './_auth.cjs';

const { requireBusinessActor, resolveTenant, authFailure } = auth;
const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, OPTIONS'};
const response=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
function todayInSouthAfrica(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export const handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers,body:''};
  if(event.httpMethod!=='GET')return response(405,{error:'Method not allowed'});
  const authResult=requireBusinessActor(event);
  if(!authResult.ok)return authFailure(authResult,headers);
  if(authResult.principal.actorType!=='employee')return authFailure({status:403,error:'Employee authorization required'},headers);
  const requestedBusinessId=event.queryStringParameters?.businessId||null;
  const tenant=resolveTenant(authResult.principal,requestedBusinessId);
  if(!tenant.ok)return authFailure(tenant,headers);
  const businessId=tenant.businessId;
  const employeeId=authResult.principal.employeeId;
  if(!employeeId)return authFailure({status:403,error:'Employee authorization required'},headers);
  const supabaseUrl=process.env.SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_KEY;
  if(!supabaseUrl||!serviceKey)return response(500,{error:'Server configuration error'});
  const today=todayInSouthAfrica(),read={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`};
  const fields='id,guest_name,guest_phone,guest_country,check_in_date,check_out_date,status,room_id,room_number,room_name';
  const base=`${supabaseUrl}/rest/v1/bookings?business_id=eq.${encodeURIComponent(businessId)}&select=${fields}&order=check_in_date.asc`;
  const restrictionsFields='booking_id,vegetarian,vegan,pescatarian,halal,kosher,gluten_free,lactose_free,nut_allergy,seafood_allergy,diabetic,no_pork,other,other_text,carnivore';
  try{
    const [a,d,s]=await Promise.all([
      fetch(`${base}&check_in_date=eq.${encodeURIComponent(today)}`,{headers:read}),
      fetch(`${base}&check_out_date=eq.${encodeURIComponent(today)}`,{headers:read}),
      fetch(`${base}&check_in_date=lt.${encodeURIComponent(today)}&check_out_date=gt.${encodeURIComponent(today)}&status=eq.checked_in`,{headers:read}),
    ]);
    for(const r of [a,d,s])if(!r.ok)throw new Error(`Bookings query failed with HTTP ${r.status}`);
    const [arrivals,departures,stayovers]=await Promise.all([a.json(),d.json(),s.json()]);
    const guests=[...(arrivals||[]),...(stayovers||[]),...(departures||[])];
    const bookingIds=[...new Set(guests.map(g=>g.id).filter(Boolean))];
    let restrictions=[];
    if(bookingIds.length){
      const filter=bookingIds.join(',');
      const r=await fetch(`${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=in.(${encodeURIComponent(filter)})&select=${restrictionsFields}`,{headers:read});
      if(!r.ok)throw new Error(`Food restrictions query failed with HTTP ${r.status}`);
      restrictions=await r.json();
    }
    const restrictionsByBooking=new Map((restrictions||[]).map(r=>[r.booking_id,r]));
    const attachRestrictions=(guest)=>({...guest,food_restrictions:restrictionsByBooking.get(guest.id)||null});
    return response(200,{success:true,date:today,arrivals:(arrivals||[]).map(attachRestrictions),stayovers:(stayovers||[]).map(attachRestrictions),departures:(departures||[]).map(attachRestrictions)});
  }catch(error){console.error('get-employee-overview error:',error);return response(500,{error:'Unable to load employee overview'});}
};
