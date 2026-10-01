import { useEffect, useMemo, useState } from 'react';
import { FileDown, Mail, RefreshCw, X } from 'lucide-react';
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

  const filtered=useMemo(()=>date?records.filter(r=>r.stay_day===date):records,[records,date]);
  const totals=useMemo(()=>({
    taken:filtered.reduce((n,r)=>n+Number(r.quantity_taken||0),0),
    restocked:filtered.reduce((n,r)=>n+Number(r.quantity_restocked||0),0),
    sales:filtered.reduce((n,r)=>n+Number(r.sales_value||0),0)
  }),[filtered]);
  const dates=[...new Set(records.map(r=>r.stay_day).filter(Boolean) as string[])].sort().reverse();
  const detailRows=selected?records.filter(r=>r.stay_day===selected.stay_day && (selected.booking_id ? r.booking_id===selected.booking_id : r.room_id===selected.room_id)):[];
  const detailSales=detailRows.reduce((n,r)=>n+Number(r.sales_value||0),0);
  const downloadPdf=(record?:HousekeepingInventoryRecord)=>{
    const qs=new URLSearchParams({businessId});
    if(record?.booking_id)qs.set('bookingId',record.booking_id);
    if(record?.room_id)qs.set('roomId',record.room_id);
    if(record?.stay_day)qs.set('date',record.stay_day);
    window.open('/.netlify/functions/generate-housekeeping-inventory-snapshot?'+qs.toString(),'_blank','noopener,noreferrer');
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
    <div className="flex flex-wrap gap-2 items-center">
      <select value={date} onChange={e=>setDate(e.target.value)} className="px-3 py-2 text-xs border border-gray-300 rounded-lg"><option value="">All stay days</option>{dates.map(d=><option key={d} value={d}>{dateLabel(d)}</option>)}</select>
      <span className="text-xs text-gray-500">{filtered.length} transaction{filtered.length===1?'':'s'}</span>
    </div>
    {loading?<p className="py-8 text-center text-sm text-gray-400">Loading inventory…</p>:filtered.length===0?<p className="py-8 text-center text-sm text-gray-400">No inventory has been recorded yet.</p>:
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-gray-50 text-left text-gray-500 uppercase tracking-wider"><tr><th className="px-3 py-2">Stay day</th><th className="px-3 py-2">Room / guest</th><th className="px-3 py-2">Amenity</th><th className="px-3 py-2">Taken</th><th className="px-3 py-2">Restocked</th><th className="px-3 py-2">Sales</th><th className="px-3 py-2"></th></tr></thead><tbody className="divide-y divide-gray-100">{filtered.map(r=><tr key={r.id} className="hover:bg-orange-50/40"><td className="px-3 py-2">{dateLabel(r.stay_day)}</td><td className="px-3 py-2"><button type="button" onClick={()=>setSelected(r)} className="text-left"><span className="font-semibold text-gray-900">{r.room_number?'Room '+r.room_number:r.room_name||'Room'}</span><span className="block text-gray-500">{r.guest_name||'—'}</span></button></td><td className="px-3 py-2 font-medium">{r.item_name_snapshot}</td><td className="px-3 py-2">{r.quantity_taken}</td><td className="px-3 py-2">{r.quantity_restocked}</td><td className="px-3 py-2 font-semibold">{r.quantity_taken>0?money(r.sales_value,r.currency):'—'}</td><td className="px-3 py-2"><button type="button" onClick={()=>downloadPdf(r)} title="Download room snapshot PDF" className="p-1.5 rounded hover:bg-gray-100"><FileDown size={14}/></button></td></tr>)}</tbody></table></div>}
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <div><h4 className="text-sm font-semibold text-gray-900">Inventory notifications</h4><p className="text-xs text-gray-500">Use the dashboard, email, or both.</p></div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.dashboardEnabled} onChange={e=>void savePrefs({...settings,dashboardEnabled:e.target.checked})}/><span>Show inventory activity on dashboard</span></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.emailEnabled} onChange={e=>setSettings(s=>({...s,emailEnabled:e.target.checked}))}/><span>Send inventory activity by email</span></label>
      {settings.emailEnabled&&<div className="flex flex-wrap gap-2"><input type="email" value={settings.email} onChange={e=>setSettings(s=>({...s,email:e.target.value}))} placeholder="manager@example.com" className="flex-1 min-w-[240px] px-3 py-2 text-xs border border-gray-300 rounded-lg"/><button type="button" disabled={savingSettings||!settings.email.trim()} onClick={()=>void savePrefs()} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-900 text-white rounded-lg disabled:opacity-50"><Mail size={13}/>{savingSettings?'Saving…':'Save email'}</button></div>}
    </div>
    {selected&&<div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={()=>setSelected(null)}><div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="px-5 py-4 border-b flex items-start justify-between"><div><h4 className="font-bold text-gray-900">{selected.room_number?'Room '+selected.room_number:selected.room_name||'Room'} — {selected.guest_name||'Guest'}</h4><p className="text-xs text-gray-500">{dateLabel(selected.stay_day)} · Complete inventory & amenity sales</p></div><button type="button" onClick={()=>setSelected(null)} className="p-1 rounded hover:bg-gray-100"><X size={16}/></button></div><div className="p-5 space-y-4"><div className="grid grid-cols-3 gap-3"><div className="bg-stone-50 rounded-xl p-3"><p className="text-[10px] uppercase text-stone-500">Sales</p><p className="text-lg font-bold">{money(detailSales,selected.currency)}</p></div><div className="bg-stone-50 rounded-xl p-3"><p className="text-[10px] uppercase text-stone-500">Items taken</p><p className="text-lg font-bold">{detailRows.reduce((n,r)=>n+Number(r.quantity_taken||0),0)}</p></div><div className="bg-stone-50 rounded-xl p-3"><p className="text-[10px] uppercase text-stone-500">Items restocked</p><p className="text-lg font-bold">{detailRows.reduce((n,r)=>n+Number(r.quantity_restocked||0),0)}</p></div></div><div className="overflow-x-auto border rounded-xl"><table className="w-full text-xs"><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Amenity</th><th className="px-3 py-2">Taken</th><th className="px-3 py-2">Restocked</th><th className="px-3 py-2 text-right">Sales</th></tr></thead><tbody className="divide-y divide-gray-100">{detailRows.map(r=><tr key={r.id}><td className="px-3 py-2 font-medium">{r.item_name_snapshot}</td><td className="px-3 py-2 text-center">{r.quantity_taken}</td><td className="px-3 py-2 text-center">{r.quantity_restocked}</td><td className="px-3 py-2 text-right">{r.quantity_taken>0?money(r.sales_value,r.currency):'—'}</td></tr>)}</tbody></table></div><div className="border rounded-xl p-4 text-xs space-y-2"><p><span className="text-gray-400">Stay:</span> {selected.check_in_date||'—'} → {selected.check_out_date||'—'}</p><p><span className="text-gray-400">Recorded by:</span> {selected.employee_name||'—'}</p><p><span className="text-gray-400">Recorded:</span> {new Date(selected.created_at).toLocaleString('en-ZA')}</p><p><span className="text-gray-400">Billing:</span> Not billed — operational record only</p></div><div className="flex justify-end"><button type="button" onClick={()=>downloadPdf(selected)} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600"><FileDown size={14}/>Download Snapshot PDF</button></div></div></div></div>}
  </section>;
}
