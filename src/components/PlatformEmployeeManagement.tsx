import { useEffect, useState } from 'react';
import { getAuthHeader } from '../utils/auth';

type Position='general_manager'|'manager'|'supervisor'|'member';
type Right='operations'|'developer'|'finance'|'analytics'|'compliance'|'support';
type Status='Invited'|'Active'|'Archived';
interface Employee{id:string;full_name:string;email:string;phone?:string|null;position:Position;rights:Right[];status:Status;invited_at:string;activated_at?:string|null;last_login?:string|null;archived_at?:string|null;}

const positions:Record<Position,string>={general_manager:'General Manager',manager:'Manager',supervisor:'Supervisor',member:'Member'};
const rights:Record<Right,string>={operations:'Operations',developer:'Developer',finance:'Finance',analytics:'Analytics',compliance:'Compliance',support:'Support'};
const rightKeys=Object.keys(rights) as Right[];
const emptyForm={full_name:'',email:'',phone:'',position:'member' as Position,rights:[] as Right[]};

export default function PlatformEmployeeManagement(){
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [status,setStatus]=useState<'all'|Status>('all');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [editing,setEditing]=useState<Employee|null>(null),[form,setForm]=useState(emptyForm);

 const load=async()=>{setLoading(true);setError('');try{const q=status==='all'?'':`?status=${status}`;const r=await fetch('/.netlify/functions/manage-platform-employees'+q,{headers:getAuthHeader()});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Failed to load employees (${r.status})`);setEmployees(d.data||[])}catch(e){setError(e instanceof Error?e.message:'Failed to load employees')}finally{setLoading(false)}};
 useEffect(()=>{load()},[status]);

 const setRight=(right:Right,checked:boolean)=>setForm(f=>({...f,rights:checked?[...new Set([...f.rights,right])]:f.rights.filter(r=>r!==right)}));
 const startEdit=(emp:Employee)=>{setEditing(emp);setForm({full_name:emp.full_name,email:emp.email,phone:emp.phone||'',position:emp.position,rights:emp.rights})};
 const cancelEdit=()=>{setEditing(null);setForm(emptyForm)};

 const save=async(e:React.FormEvent)=>{e.preventDefault();if(form.rights.length===0){setError('Select at least one right.');return}setSaving(true);setError('');try{
   const method=editing?'PATCH':'POST';const body=editing?{id:editing.id,full_name:form.full_name,phone:form.phone,position:form.position,rights:form.rights}:form;
   const r=await fetch('/.netlify/functions/manage-platform-employees',{method,headers:{'Content-Type':'application/json',...getAuthHeader()},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(d.error||`Failed to ${editing?'update':'invite'} employee (${r.status})`);
   cancelEdit();setStatus('all');await load();
   if(!editing) alert(d.email_id?`Invitation sent successfully. Resend ID: ${d.email_id}`:'Invitation sent successfully.');
 }catch(e){setError(e instanceof Error?e.message:'Failed to save employee')}finally{setSaving(false)}};

 const action=async(id:string,a:'archive'|'restore'|'resend')=>{if(a==='archive'&&!confirm('Archive this FastCheckIn employee? They will no longer be able to sign in.'))return;setSaving(true);setError('');try{const r=await fetch('/.netlify/functions/manage-platform-employees',{method:'PATCH',headers:{'Content-Type':'application/json',...getAuthHeader()},body:JSON.stringify({id,action:a})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Action failed (${r.status})`);if(a==='resend')alert(d.email_id?`Invitation resent successfully. Resend ID: ${d.email_id}`:'Invitation resent successfully.');await load()}catch(e){setError(e instanceof Error?e.message:'Action failed')}finally{setSaving(false)}};

 const formBlock=<form onSubmit={save} className="p-6 border-b bg-stone-50 space-y-4">
   <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
    <input required placeholder="Full name" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} className="border rounded-lg p-2.5"/>
    <input required disabled={!!editing} type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="border rounded-lg p-2.5 disabled:bg-stone-100"/>
    <input placeholder="Phone (optional)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="border rounded-lg p-2.5"/>
    <select value={form.position} onChange={e=>setForm({...form,position:e.target.value as Position})} className="border rounded-lg p-2.5">{(Object.keys(positions) as Position[]).map(p=><option key={p} value={p}>{positions[p]}</option>)}</select>
   </div>
   <div>
    <div className="text-sm font-semibold text-stone-800 mb-2">Rights <span className="font-normal text-stone-500">(select one or more)</span></div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {rightKeys.map(right=><label key={right} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 cursor-pointer"><input type="checkbox" checked={form.rights.includes(right)} onChange={e=>setRight(right,e.target.checked)}/><span className="text-sm">{rights[right]}</span></label>)}
    </div>
   </div>
   <div className="flex gap-2"><button disabled={saving||form.rights.length===0} className="bg-orange-500 text-white rounded-lg px-5 py-2 font-semibold disabled:opacity-50">{editing?'Save changes':'Invite employee'}</button>{editing&&<button type="button" onClick={cancelEdit} className="border rounded-lg px-5 py-2">Cancel</button>}</div>
 </form>;

 return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><div className="bg-white rounded-lg shadow overflow-hidden">
   <div className="px-6 py-4 bg-stone-900 text-white flex flex-wrap justify-between gap-3 items-center"><div><h2 className="text-lg font-semibold">FastCheckIn Employees</h2><p className="text-xs text-stone-300 mt-1">Internal platform personnel — separate from business employees.</p></div><select value={status} onChange={e=>setStatus(e.target.value as any)} className="bg-white text-stone-900 rounded-lg px-3 py-2 text-sm"><option value="all">All employees</option><option value="Active">Active</option><option value="Invited">Invited</option><option value="Archived">Archived</option></select></div>
   {error&&<div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
   {formBlock}
   <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-stone-50 text-stone-500 uppercase text-[10px]"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Position</th><th className="px-5 py-3">Rights</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Last login</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y">
    {loading?<tr><td colSpan={6} className="p-8 text-center text-stone-400">Loading…</td></tr>:employees.length===0?<tr><td colSpan={6} className="p-8 text-center text-stone-400">No employees in this view.</td></tr>:employees.map(emp=><tr key={emp.id}>
      <td className="px-5 py-4"><div className="font-semibold">{emp.full_name}</div><div className="text-xs text-stone-500">{emp.email}{emp.phone&&` · ${emp.phone}`}</div></td>
      <td className="px-5 py-4">{positions[emp.position]||emp.position}</td>
      <td className="px-5 py-4"><div className="flex flex-wrap gap-1">{emp.rights.map(r=><span key={r} className="px-2 py-1 rounded-full bg-stone-100 text-xs">{rights[r]}</span>)}</div></td>
      <td className="px-5 py-4"><span className="px-2 py-1 rounded-full bg-stone-100 text-xs font-semibold">{emp.status}</span></td>
      <td className="px-5 py-4 text-xs text-stone-500">{emp.last_login?new Date(emp.last_login).toLocaleString('en-ZA'):'Never'}</td>
      <td className="px-5 py-4"><div className="flex flex-wrap gap-2">{emp.status!=='Archived'&&<button disabled={saving} onClick={()=>startEdit(emp)} className="text-xs text-stone-800 font-semibold">Edit</button>}{emp.status==='Invited'&&<button disabled={saving} onClick={()=>action(emp.id,'resend')} className="text-xs text-blue-700">Resend</button>}{emp.status!=='Archived'&&<button disabled={saving} onClick={()=>action(emp.id,'archive')} className="text-xs text-red-700">Archive</button>}{emp.status==='Archived'&&<button disabled={saving} onClick={()=>action(emp.id,'restore')} className="text-xs text-green-700">Restore</button>}</div></td>
    </tr>)}
   </tbody></table></div>
 </div></section>;
}
