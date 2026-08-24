const jwt = require('jsonwebtoken');
const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, OPTIONS'};
const response=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
function todayInSouthAfrica(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers,body:''};
  if(event.httpMethod!=='GET')return response(405,{error:'Method Not Allowed'});
  const token=event.headers.authorization?.replace(/^Bearer\s+/i,''); if(!token)return response(401,{error:'No authorization token provided'});
  let decoded; try{decoded=jwt.verify(token,process.env.SUPABASE_JWT_SECRET);}catch(error){return response(401,{error:error.name==='TokenExpiredError'?'Token has expired':'Invalid token signature'});}
  const metadata=decoded.user_metadata||{},businessId=metadata.business_id,employeeId=metadata.employee_id||decoded.sub;
  if(decoded.role!=='employee'||!businessId||!employeeId)return response(403,{error:'Employee authorization required'});
  const supabaseUrl=process.env.SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_KEY;
  if(!supabaseUrl||!serviceKey)return response(500,{error:'Server configuration error'});
  const today=todayInSouthAfrica(),read={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`};
  const fields='id,guest_name,guest_phone,guest_country,check_in_date,check_out_date,status,room_id,room_number,room_name,food_restrictions';
  const base=`${supabaseUrl}/rest/v1/bookings?business_id=eq.${encodeURIComponent(businessId)}&select=${fields}&order=check_in_date.asc`;
  try{
    const [a,d,s]=await Promise.all([
      fetch(`${base}&check_in_date=eq.${encodeURIComponent(today)}`,{headers:read}),
      fetch(`${base}&check_out_date=eq.${encodeURIComponent(today)}`,{headers:read}),
      fetch(`${base}&check_in_date=lt.${encodeURIComponent(today)}&check_out_date=gt.${encodeURIComponent(today)}&status=eq.checked_in`,{headers:read}),
    ]);
    for(const r of [a,d,s])if(!r.ok)throw new Error(`Bookings query failed with HTTP ${r.status}`);
    const [arrivals,departures,stayovers]=await Promise.all([a.json(),d.json(),s.json()]);
    return response(200,{success:true,date:today,arrivals:arrivals||[],stayovers:stayovers||[],departures:departures||[]});
  }catch(error){console.error('get-employee-overview error:',error);return response(500,{error:'Unable to load employee overview'});}
};
