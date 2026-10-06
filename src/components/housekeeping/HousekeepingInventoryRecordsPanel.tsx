import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileDown, Mail, RefreshCw, X } from 'lucide-react';
import { getApiAuthToken } from '../../utils/auth';
import {
  fetchHousekeepingInventoryNotificationSettings,
  fetchHousekeepingInventoryRecords,
  saveHousekeepingInventoryNotificationSettings,
  type HousekeepingInventoryRecord,
} from '../../services/housekeepingInventoryApi';

interface Props { businessId:string; }
const money=(value:number|null|undefined,currency='ZAR')=>new Intl.NumberFormat('en-ZA',{style:'currency',currency,maximumFractionDigits:2}).format(Number(value||0));
const dateLabel=(value:string|null|undefined)=>value?new Date(value+'T12:00:00').toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'}):'—';

export default function HousekeepingInventoryRecordsPanel({businessId}:Props){
  const [records,setRecords]=useState<HousekeepingInventoryRecord[]>([]);
  const [selected,setSelected]=useState<HousekeepingInventoryRecord|null>(null);
  const [date,setDate]=useState('');
  const [roomFilter,setRoomFilter]=useState('');
  const [calendarMonth,setCalendarMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1);});
  const [calendarOpen,setCalendarOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [settings,setSettings]=useState({dashboardEnabled:true,emailEnabled:false,email:''});
  const [savingSettings,setSavingSettings]=useState(false);
  const [error,setError]=useState<string|null>(null);

  const load=async()=>{
    setLoading(true);setError(null);
    try{
      const [rows,prefs]=await Promise.all([fetchHousekeepingInventoryRecords(businessId,{limit:250}),fetchHousekeepingInventoryNotificationSettings(businessId)]);
      setRecords(rows);setSettings(prefs);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load inventory records');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[businessId]);

  const filtered=useMemo(()=>records.filter(r=>
    (!date || r.stay_day===date) &&
    (!roomFilter || (r.room_id||'')===roomFilter)
  ),[records,date,roomFilter]);

  const roomOptions=useMemo(()=>{
    const map=new Map<string,string>();
    for(const record of records){
      const id=record.room_id||'';
      if(!id) continue;
      map.set(id,record.room_number ? 'Room '+record.room_number+(record.room_name?' — '+record.room_name:'') : (record.room_name||'Room'));
    }
    return [...map.entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  },[records]);

  const calendarYear=calendarMonth.getFullYear();
  const calendarMonthIndex=calendarMonth.getMonth();
  const calendarDaysInMonth=new Date(calendarYear,calendarMonthIndex+1,0).getDate();
  const calendarStartOffset=new Date(calendarYear,calendarMonthIndex,1).getDay();
  const calendarCells=Array.from({length:calendarStartOffset+calendarDaysInMonth},(_,index)=>{
    const day=index-calendarStartOffset+1;
    return day>0 ? new Date(calendarYear,calendarMonthIndex,day) : null;
  });
  const takenDates=useMemo(()=>new Set(
    records.filter(r=>Number(r.quantity_taken||0)>0).map(r=>r.stay_day)
  ),[records]);
  const calendarDateKey=(d:Date)=>[
    d.getFullYear(),
    String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')
  ].join('-');
  const calendarMonthLabel=calendarMonth.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});

  type RoomDayGroup = {
    key:string;
    stay_day:string;
    room_id:string|null;
    booking_id:string|null;
    room_number:string|null;
    room_name:string|null;
    guest_name:string|null;
    currency:string;
    records:HousekeepingInventoryRecord[];
    taken:number;
    restocked:number;
    sales:number;
    representative:HousekeepingInventoryRecord;
  };

  const roomDayGroups=useMemo<RoomDayGroup[]>(()=>{
    const groups=new Map<string,RoomDayGroup>();
    for(const record of filtered){
      const key=record.stay_day+'|'+(record.booking_id||record.room_id||'unknown');
      const existing=groups.get(key);
      if(existing){
        existing.records.push(record);
        existing.taken+=Number(record.quantity_taken||0);
        existing.restocked+=Number(record.quantity_restocked||0);
        existing.sales+=Number(record.sales_value||0);
      }else{
        groups.set(key,{
          key,
          stay_day:record.stay_day,
          room_id:record.room_id,
          booking_id:record.booking_id,
          room_number:record.room_number,
          room_name:record.room_name,
          guest_name:record.guest_name,
          currency:record.currency||'ZAR',
          records:[record],
          taken:Number(record.quantity_taken||0),
          restocked:Number(record.quantity_restocked||0),
          sales:Number(record.sales_value||0),
          representative:record,
        });
      }
    }
    return [...groups.values()].sort((a,b)=>a.stay_day.localeCompare(b.stay_day)||String(a.room_number||a.room_name||'').localeCompare(String(b.room_number||b.room_name||'')));
  },[filtered]);

  const totals=useMemo(()=>({
    taken:filtered.reduce((n,r)=>n+Number(r.quantity_taken||0),0),
    restocked:filtered.reduce((n,r)=>n+Number(r.quantity_restocked||0),0),
    sales:filtered.reduce((n,r)=>n+Number(r.sales_value||0),0)
  }),[filtered]);

  const dates=[...new Set(records.map(r=>r.stay_day).filter(Boolean) as string[])].sort().reverse();
  const selectedGroup=selected?roomDayGroups.find(g=>g.stay_day===selected.stay_day && (selected.booking_id ? g.booking_id===selected.booking_id : g.room_id===selected.room_id)):null;
  const detailRows=selectedGroup?.records||[];
  const detailSales=selectedGroup?.sales||0;
  const downloadPdf=async(record?:HousekeepingInventoryRecord)=>{
    const qs=new URLSearchParams({businessId});
    if(record?.booking_id)qs.set('bookingId',record.booking_id);
    if(record?.room_id)qs.set('roomId',record.room_id);
    if(record?.stay_day)qs.set('date',record.stay_day);
    try{
      const token=getApiAuthToken();
      const response=await fetch('/.netlify/functions/generate-housekeeping-inventory-snapshot?'+qs.toString(),{headers:token?{Authorization:'Bearer '+token}:{}});
      if(!response.ok){
        const data=await response.json().catch(()=>({}));
        throw new Error(data.error||'Unable to download inventory snapshot');
      }
      const blob=await response.blob();
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;
      anchor.download=(record?.room_number?'room-'+record.room_number+'-':'')+'amenities-snapshot-'+(record?.stay_day||'overview')+'.pdf';
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      URL.revokeObjectURL(url);
    }catch(error){setError(error instanceof Error?error.message:'Unable to download inventory snapshot');}
  };
  const savePrefs=async(next= settings)=>{
    setSavingSettings(true);setError(null);
    try{await saveHousekeepingInventoryNotificationSettings(businessId,next);setSettings(next);}
    catch(e){setError(e instanceof Error?e.message:'Unable to save notification settings');}
    finally{setSavingSettings(false);}
  };

  return <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-base font-bold text-gray-900">Inventory & amenity sales</h3><p className="text-xs text-gray-500">Inventory stays attached to the room, booking and stay day. Recorded sales are not guest charges.</p></div>
      <button type="button" onClick={()=>void load()} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw size={13}/>Refresh</button>
    </div>
    {error&&<p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><p className="text-[10px] uppercase text-stone-500">Recorded sales</p><p className="text-xl font-bold">{money(totals.sales)}</p></div>
      <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><p className="text-[10px] uppercase text-stone-500">Items taken</p><p className="text-xl font-bold">{totals.taken}</p></div>
      <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><p className="text-[10px] uppercase text-stone-500">Items restocked</p><p className="text-xl font-bold">{totals.restocked}</p></div>
      <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><p className="text-[10px] uppercase text-stone-500">Recorded days</p><p className="text-xl font-bold">{dates.length}</p></div>
    </div>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={()=>setCalendarOpen(open=>!open)}
          aria-expanded={calendarOpen}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
        >
          <span aria-hidden>▣</span>
          <span>{date ? dateLabel(date) : 'Filter'}</span>
        </button>
        {calendarOpen&&<div role="dialog" aria-label="Amenity activity calendar" className="absolute left-0 top-full z-30 mt-2 w-[310px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button type="button" onClick={()=>setCalendarMonth(new Date(calendarYear,calendarMonthIndex-1,1))} aria-label="Previous month" className="p-1.5 rounded-lg hover:bg-gray-50"><ChevronLeft size={16}/></button>
            <div className="text-sm font-bold text-gray-900">{calendarMonthLabel}</div>
            <button type="button" onClick={()=>setCalendarMonth(new Date(calendarYear,calendarMonthIndex+1,1))} aria-label="Next month" className="p-1.5 rounded-lg hover:bg-gray-50"><ChevronRight size={16}/></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(day=><div key={day} className="text-center text-[10px] font-semibold text-gray-400 py-1">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day,index)=>{
              if(!day) return <div key={'empty-'+index} className="h-9"/>;
              const key=calendarDateKey(day);
              const hasTaken=roomFilter
                ? records.some(r=>r.stay_day===key && (r.room_id||'')===roomFilter && Number(r.quantity_taken||0)>0)
                : takenDates.has(key);
              const selectedDay=date===key;
              return <button
                key={key}
                type="button"
                onClick={()=>{setDate(selectedDay?'':key);setCalendarOpen(false);}}
                aria-label={dateLabel(key)+(hasTaken?' — amenities taken':'')}
                aria-pressed={selectedDay}
                className={`h-9 rounded-lg border text-xs transition-colors ${selectedDay?'border-orange-500 bg-orange-500 text-white':'border-transparent hover:bg-gray-50 text-gray-700'} ${hasTaken&&!selectedDay?'border-orange-200 bg-orange-50 font-semibold':'font-medium'}`}
              >{day.getDate()}</button>;
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-gray-500">
            <span><span className="inline-block h-3 w-3 rounded-sm border border-orange-200 bg-orange-50 align-[-2px] mr-1"></span> = amenities taken</span>
            {date&&<button type="button" onClick={()=>setDate('')} className="font-semibold text-orange-700 hover:text-orange-800">Clear date</button>}
          </div>
        </div>}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs font-semibold text-gray-600" htmlFor="housekeeping-inventory-room-filter">Room</label>
        <select id="housekeeping-inventory-room-filter" value={roomFilter} onChange={e=>setRoomFilter(e.target.value)} className="min-w-[220px] px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white">
          <option value="">All rooms</option>
          {roomOptions.map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select>
        <span className="text-xs text-gray-500">{filtered.length} transaction{filtered.length===1?'':'s'}</span>
      </div>
    </div>
    <div className="text-xs text-gray-500">
      {date ? <><span className="font-semibold text-gray-800">{dateLabel(date)}</span>{roomFilter?' · filtered by room':''}</> : 'Select a date from the calendar to view amenity activity.'}
    </div>
    {loading?<p className="py-8 text-center text-sm text-gray-400">Loading inventory…</p>:roomDayGroups.length===0?<p className="py-8 text-center text-sm text-gray-400">No inventory has been recorded yet.</p>:
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-gray-50 text-left text-gray-500 uppercase tracking-wider"><tr><th className="px-3 py-2">Stay day</th><th className="px-3 py-2">Room / guest</th><th className="px-3 py-2">Items taken</th><th className="px-3 py-2">Items restocked</th><th className="px-3 py-2">Sales</th><th className="px-3 py-2"></th></tr></thead><tbody className="divide-y divide-gray-100">{roomDayGroups.map(g=><tr key={g.key} className="hover:bg-orange-50/40"><td className="px-3 py-2 whitespace-nowrap">{dateLabel(g.stay_day)}</td><td className="px-3 py-2"><button type="button" onClick={()=>setSelected(g.representative)} className="text-left"><span className="font-semibold text-gray-900">{g.room_number?'Room '+g.room_number:g.room_name||'Room'}</span><span className="block text-gray-500">{g.guest_name||'—'}</span><span className="block text-[10px] text-gray-400">{g.records.length} amenity line{g.records.length===1?'':'s'}</span></button></td><td className="px-3 py-2">{g.taken}</td><td className="px-3 py-2">{g.restocked}</td><td className="px-3 py-2 font-semibold">{g.taken>0?money(g.sales,g.currency):'—'}</td><td className="px-3 py-2"><button type="button" onClick={()=>downloadPdf(g.representative)} title="Download room snapshot PDF" className="p-1.5 rounded hover:bg-gray-100"><FileDown size={14}/></button></td></tr>)}</tbody></table></div>}

    <div className="border-t border-gray-100 pt-4 space-y-3">
      <div><h4 className="text-sm font-semibold text-gray-900">Inventory notifications</h4><p className="text-xs text-gray-500">Use the dashboard, email, or both.</p></div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.dashboardEnabled} onChange={e=>void savePrefs({...settings,dashboardEnabled:e.target.checked})}/><span>Show inventory activity on dashboard</span></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.emailEnabled} onChange={e=>setSettings(s=>({...s,emailEnabled:e.target.checked}))}/><span>Send inventory activity by email</span></label>
      {settings.emailEnabled&&<div className="flex flex-wrap gap-2"><input type="email" value={settings.email} onChange={e=>setSettings(s=>({...s,email:e.target.value}))} placeholder="manager@example.com" className="flex-1 min-w-[240px] px-3 py-2 text-xs border border-gray-300 rounded-lg"/><button type="button" disabled={savingSettings||!settings.email.trim()} onClick={()=>void savePrefs()} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-900 text-white rounded-lg disabled:opacity-50"><Mail size={13}/>{savingSettings?'Saving…':'Save email'}</button></div>}
    </div>
    {selected&&<div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={()=>setSelected(null)}><div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="px-5 py-4 border-b flex items-start justify-between"><div><h4 className="font-bold text-gray-900">{selected.room_number?'Room '+selected.room_number:selected.room_name||'Room'} — {selected.guest_name||'Guest'}</h4><p className="text-xs text-gray-500">{dateLabel(selected.stay_day)} · Complete inventory & amenity sales</p></div><button type="button" onClick={()=>setSelected(null)} className="p-1 rounded hover:bg-gray-100"><X size={16}/></button></div><div className="p-5 space-y-4"><div className="grid grid-cols-3 gap-3"><div className="bg-stone-50 rounded-xl p-3"><p className="text-[10px] uppercase text-stone-500">Sales</p><p className="text-lg font-bold">{money(detailSales,selected.currency)}</p></div><div className="bg-stone-50 rounded-xl p-3"><p className="text-[10px] uppercase text-stone-500">Items taken</p><p className="text-lg font-bold">{detailRows.reduce((n,r)=>n+Number(r.quantity_taken||0),0)}</p></div><div className="bg-stone-50 rounded-xl p-3"><p className="text-[10px] uppercase text-stone-500">Items restocked</p><p className="text-lg font-bold">{detailRows.reduce((n,r)=>n+Number(r.quantity_restocked||0),0)}</p></div></div><div className="overflow-x-auto border rounded-xl"><table className="w-full text-xs"><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Amenity</th><th className="px-3 py-2">Taken</th><th className="px-3 py-2">Restocked</th><th className="px-3 py-2 text-right">Sales</th></tr></thead><tbody className="divide-y divide-gray-100">{detailRows.map(r=><tr key={r.id}><td className="px-3 py-2 font-medium">{r.item_name_snapshot}</td><td className="px-3 py-2 text-center">{r.quantity_taken}</td><td className="px-3 py-2 text-center">{r.quantity_restocked}</td><td className="px-3 py-2 text-right">{r.quantity_taken>0?money(r.sales_value,r.currency):'—'}</td></tr>)}</tbody></table></div><div className="border rounded-xl p-4 text-xs space-y-2"><p><span className="text-gray-400">Stay:</span> {selected.check_in_date||'—'} → {selected.check_out_date||'—'}</p><p><span className="text-gray-400">Recorded by:</span> {selected.employee_name||'—'}</p><p><span className="text-gray-400">Recorded:</span> {new Date(selected.created_at).toLocaleString('en-ZA')}</p><p><span className="text-gray-400">Billing:</span> Not billed — operational record only</p></div><div className="flex justify-end"><button type="button" onClick={()=>downloadPdf(selected)} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600"><FileDown size={14}/>Download Snapshot PDF</button></div></div></div></div>}
  </section>;
}
