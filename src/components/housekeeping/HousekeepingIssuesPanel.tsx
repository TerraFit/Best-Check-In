import { useCallback, useEffect, useState } from 'react';
import { fetchHousekeepingIssues } from '../../services/housekeepingApi';
import type { HousekeepingIssue } from '../../types/housekeepingIssues';

interface Props { businessId: string; }
export default function HousekeepingIssuesPanel({ businessId }: Props) {
  const [issues, setIssues] = useState<HousekeepingIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setIssues(await fetchHousekeepingIssues({ businessId })); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load housekeeping issues.'); } finally { setLoading(false); } }, [businessId]);
  useEffect(() => { void load(); }, [load]);
  return <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h3 className="text-base font-bold text-gray-900">Housekeeping Issues</h3><p className="text-xs text-gray-500">Issues reported by housekeepers during room service.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-50">Refresh</button></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
    {loading ? <p className="text-sm text-gray-400 py-4 text-center">Loading issues…</p> : !issues.length ? <p className="text-sm text-gray-400 py-4 text-center">No housekeeping issues reported.</p> : <div className="space-y-2">{issues.map((issue) => <article key={issue.id} className="rounded-xl border border-gray-200 p-3"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-sm text-gray-900">Room {issue.room_number || issue.room_id}</span><span className="text-xs text-gray-500">{issue.checklist_item_label}</span><span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">{issue.issue_type}</span><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold capitalize">{issue.priority}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${issue.status === 'resolved' || issue.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{issue.status.replace('_',' ')}</span>{issue.maintenance_requested && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Maintenance</span>}</div><p className="text-xs text-gray-600 mt-2">{issue.other_description || issue.description || 'No additional details.'}</p><p className="text-[10px] text-gray-400 mt-2">Reported by {issue.employee_name || 'Housekeeping'} · {new Date(issue.reported_at).toLocaleString()}</p></article>)}</div>}
  </section>;
}
