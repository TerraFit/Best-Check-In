import { useCallback, useEffect, useState } from 'react';
import { fetchHousekeepingPerformance } from '../../services/housekeepingApi';
import type { HousekeepingPerformanceResponse } from '../../services/housekeepingApi';

interface Props {
  businessId: string;
}

const MANAGEMENT_ROLES = new Set([
  'business',
  'business_owner',
  'general_manager',
  'supervisor',
  'team_leader',
  'administration',
  'super_admin',
]);

function formatSeconds(seconds: number): string {
  if (!seconds || seconds < 60) return `${Math.round(seconds || 0)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}

function dateValue(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export default function HousekeepingPerformancePanel({ businessId }: Props) {
  const [dateFrom, setDateFrom] = useState(dateValue(29));
  const [dateTo, setDateTo] = useState(dateValue(0));
  const [data, setData] = useState<HousekeepingPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchHousekeepingPerformance({ businessId, dateFrom, dateTo }));
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Unable to load housekeeping performance.');
    } finally {
      setLoading(false);
    }
  }, [businessId, dateFrom, dateTo]);

  useEffect(() => {
    if (!isManagementUser()) return;
    void load();
  }, [load]);

  if (!isManagementUser()) return null;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Housekeeping Performance</h3>
          <p className="text-sm text-gray-500">Management view of service timing, quality, checklist completion and rework.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">From<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700" /></label>
          <label className="text-xs text-gray-500">To<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700" /></label>
          <button type="button" onClick={() => void load()} disabled={loading} className="px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading && !data && <div className="py-8 text-center text-sm text-gray-400">Loading performance…</div>}

      {data && <>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Metric label="Completed" value={String(data.summary.count)} />
          <Metric label="Avg actual" value={formatSeconds(data.summary.averageActualSeconds)} />
          <Metric label="Avg target" value={formatSeconds(data.summary.averageTargetSeconds)} />
          <Metric label="Variance" value={formatSeconds(data.summary.averageVarianceSeconds)} />
          <Metric label="Within target" value={`${data.summary.withinTargetRate}%`} />
          <Metric label="Avg issues" value={String(data.summary.averageIssues)} />
          <Metric label="Checklist" value={data.summary.checklistCompletionRate == null ? '—' : `${data.summary.checklistCompletionRate}%`} />
          <Metric label="Quality pass" value={data.summary.qualityPassRate == null ? '—' : `${data.summary.qualityPassRate}%`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Service types</h4>
            <div className="space-y-2">
              {data.byServiceType.length === 0 ? <Empty /> : data.byServiceType.map((row) => <Row key={row.serviceType} name={row.serviceType.replaceAll('_', ' ')} count={row.count} variance={row.averageVarianceSeconds} />)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Employees</h4>
            <div className="space-y-2">
              {data.byEmployee.length === 0 ? <Empty /> : data.byEmployee.slice(0, 10).map((row) => <Row key={row.employeeId || row.employeeName} name={row.employeeName} count={row.count} variance={row.averageVarianceSeconds} />)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Room performance</h4>
            <div className="space-y-2">
              {data.byRoom.length === 0 ? <Empty /> : data.byRoom.slice(0, 10).map((row) => <Row key={row.roomId || 'unassigned'} name={row.roomId || 'Unassigned'} count={row.count} variance={row.averageVarianceSeconds} />)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Daily performance</h4>
            <div className="space-y-2 max-h-72 overflow-auto">
              {data.daily.length === 0 ? <Empty /> : data.daily.map((row) => <Row key={row.date} name={row.date} count={row.count} variance={row.averageVarianceSeconds} />)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
          <span>Over target: {data.summary.overTargetRate}%</span>
          <span>Rework: {data.summary.reworkCount} services</span>
          <span>Total rework time: {formatSeconds(data.summary.totalReworkSeconds)}</span>
          <span>Source sessions: {data.meta.completedSessionsReturned}</span>
          {data.meta.skippedSessionsWithoutValidTiming > 0 && (
            <span>Skipped invalid timing: {data.meta.skippedSessionsWithoutValidTiming}</span>
          )}
        </div>
      </>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}

function Row({ name, count, variance }: { name: string; count: number; variance: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-800 truncate">{name}</span>
      <span className="text-gray-500 whitespace-nowrap">{count} · {formatSeconds(variance)}</span>
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-gray-400">No completed sessions in range.</div>;
}

function isManagementUser(): boolean {
  try {
    const keys = ['fastcheckin_auth', 'fastcheckin_business_auth', 'fastcheckin_employee_auth'];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const session = JSON.parse(raw);
      if (session?.type === 'super_admin') return true;
      // Business-owner login (no employee_id) — always management for performance.
      if (session?.type === 'business') return true;
      const role = String(
        session?.user?.role || session?.user?.staff_role || session?.role || session?.staff_role || ''
      ).toLowerCase();
      if (MANAGEMENT_ROLES.has(role)) return true;
      const perms = session?.user?.permission_set || session?.permission_set || [];
      if (Array.isArray(perms) && (
        perms.includes('canViewHousekeepingPerformance') ||
        perms.includes('canManageHousekeeping') ||
        perms.includes('canViewHousekeepingReports')
      )) return true;
    }
    return false;
  } catch {
    return false;
  }
}
