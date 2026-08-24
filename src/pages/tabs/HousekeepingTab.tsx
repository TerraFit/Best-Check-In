// Staff / business Housekeeping workflow
// Counters: readiness from rooms; Due counts = today's open tasks only
// Service execution: server-timestamped session + recoverable checklist timer
// Task Assignments: optional management workflow using the existing assigned_staff_id fields.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRoomDisplayName } from '../../services/roomDisplayService';
import { fetchHousekeepingTasks, updateHousekeepingTask, generateHousekeepingTasks, startHousekeepingService } from '../../services/housekeepingApi';
import { taskTypeLabel } from '../../services/housekeepingScheduleEngine';
import { getAuthHeaders } from '../../utils/auth';
import type { HousekeepingTask, HousekeepingDashboardStats } from '../../types/housekeeping';
import type { HousekeepingServiceSession } from '../../types/housekeepingServicePerformance';
import { t } from '../../i18n';
import HousekeepingServiceModal from '../../components/housekeeping/HousekeepingServiceModal';
import HousekeepingPerformancePanel from '../../components/housekeeping/HousekeepingPerformancePanel';

interface Props { businessId: string; }
type ViewFilter = 'today' | 'pending' | 'completed' | 'all';
interface Housekeeper { id: string; full_name?: string | null; name?: string | null; department?: string | null; status?: string | null; active?: boolean; }

function employeeName(employee: Housekeeper): string {
  return employee.full_name?.trim() || employee.name?.trim() || 'Housekeeper';
}

function isHousekeeper(employee: Housekeeper): boolean {
  const department = String(employee.department || '').trim().toLowerCase();
  return department === 'housekeeping' || department === 'housekeeper' || department === 'housekeepers';
}

export function HousekeepingTab({ businessId }: Props) {
  const [view, setView] = useState<ViewFilter>('today');
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [stats, setStats] = useState<HousekeepingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [activeTask, setActiveTask] = useState<HousekeepingTask | null>(null);
  const [activeSession, setActiveSession] = useState<HousekeepingServiceSession | null>(null);

  // Task Assignments is deliberately a UI-level workflow. It uses the existing
  // assigned_staff_id / assigned_staff_name task fields and does not require a
  // housekeeping database-model change.
  const [taskAssignmentsEnabled, setTaskAssignmentsEnabled] = useState(false);
  const [housekeepers, setHousekeepers] = useState<Housekeeper[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedHousekeeperId, setSelectedHousekeeperId] = useState('');
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [roomFilter, setRoomFilter] = useState('');

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true); setError(null);
    try {
      const data = await fetchHousekeepingTasks({ businessId, view });
      setTasks(data.tasks); setStats(data.stats);
      setSelectedTaskIds((current) => current.filter((id) => data.tasks.some((task) => task.id === id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_failed_load'));
    } finally { setLoading(false); }
  }, [businessId, view]);

  const loadHousekeepers = useCallback(async () => {
    if (!businessId) return;
    try {
      const response = await fetch(`/.netlify/functions/manage-employees?businessId=${encodeURIComponent(businessId)}`, { headers: getAuthHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const rows = Array.isArray(data.data) ? data.data : [];
      setHousekeepers(rows.filter((employee: Housekeeper) => {
        const active = employee.active !== false && String(employee.status || '').toLowerCase() !== 'disabled';
        return active && isHousekeeper(employee);
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load housekeepers');
    }
  }, [businessId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (taskAssignmentsEnabled) void loadHousekeepers(); }, [taskAssignmentsEnabled, loadHousekeepers]);
  useEffect(() => { if (!taskAssignmentsEnabled) { setSelectedTaskIds([]); setSelectedHousekeeperId(''); } }, [taskAssignmentsEnabled]);

  const openSession = (task: HousekeepingTask, session: HousekeepingServiceSession) => {
    setActiveTask(task); setActiveSession(session);
  };

  const startService = async (task: HousekeepingTask) => {
    setBusyId(task.id); setError(null);
    try {
      const result = await startHousekeepingService({ businessId, taskId: task.id, serviceType: task.task_type });
      const session: HousekeepingServiceSession = { ...result.session, timer_config: result.timer };
      openSession(task, session);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_update_failed'));
    } finally { setBusyId(null); }
  };

  const resumeService = (task: HousekeepingTask) => {
    if (!task.active_session) {
      setError('This active service has no recoverable session. Apply the housekeeping service migration first.');
      return;
    }
    openSession(task, task.active_session);
  };

  const runGenerate = async () => {
    setBusyId('generate'); setMessage(null); setError(null);
    try {
      const result = await generateHousekeepingTasks({ businessId, regenerate: true });
      setMessage(String(result.message || t('housekeeping_generated', { count: result.created ?? 0 })));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_generate_failed'));
    } finally { setBusyId(null); }
  };

  const act = async (task: HousekeepingTask, action: 'skip' | 'approve' | 'reject') => {
    setBusyId(task.id); setError(null);
    try {
      if (action === 'skip') await updateHousekeepingTask({ businessId, taskId: task.id, status: 'skipped', notes: noteDraft[task.id] ?? task.notes ?? undefined });
      else if (action === 'approve') await updateHousekeepingTask({ businessId, taskId: task.id, inspection_status: 'approved' });
      else await updateHousekeepingTask({ businessId, taskId: task.id, inspection_status: 'rejected', status: 'in_progress' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_update_failed'));
    } finally { setBusyId(null); }
  };

  const assignSelectedTasks = async () => {
    if (!selectedTaskIds.length) {
      setError('Select at least one room/task first.');
      return;
    }
    setAssignmentBusy(true); setError(null); setMessage(null);
    try {
      const employee = housekeepers.find((candidate) => candidate.id === selectedHousekeeperId);
      const assignedStaffId = employee?.id || null;
      const assignedStaffName = employee ? employeeName(employee) : null;
      for (const taskId of selectedTaskIds) {
        await updateHousekeepingTask({ businessId, taskId, assigned_staff_id: assignedStaffId, assigned_staff_name: assignedStaffName });
      }
      setMessage(assignedStaffId
        ? `${selectedTaskIds.length} task${selectedTaskIds.length === 1 ? '' : 's'} assigned to ${assignedStaffName}.`
        : `${selectedTaskIds.length} task${selectedTaskIds.length === 1 ? '' : 's'} returned to Any housekeeper.`);
      setSelectedTaskIds([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update task assignments');
    } finally { setAssignmentBusy(false); }
  };

  const visibleTasks = useMemo(() => {
    const normalized = roomFilter.trim().toLowerCase();
    if (!normalized) return tasks;
    return tasks.filter((task) => {
      const room = `${task.room_number ?? ''} ${task.room_name ?? ''}`.toLowerCase();
      return room.includes(normalized);
    });
  }, [tasks, roomFilter]);

  const allVisibleSelected = visibleTasks.length > 0 && visibleTasks.every((task) => selectedTaskIds.includes(task.id));
  const toggleTask = (taskId: string) => setSelectedTaskIds((current) => current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]);
  const toggleAllVisible = () => setSelectedTaskIds((current) => {
    if (allVisibleSelected) return current.filter((id) => !visibleTasks.some((task) => task.id === id));
    const ids = new Set(current);
    visibleTasks.forEach((task) => ids.add(task.id));
    return [...ids];
  });

  const views: { id: ViewFilter; label: string }[] = [
    { id: 'today', label: t('housekeeping_view_today') },
    { id: 'pending', label: t('housekeeping_view_pending') },
    { id: 'completed', label: t('housekeeping_view_completed') },
    { id: 'all', label: t('housekeeping_view_all') },
  ];
  const readyCount = stats?.rooms_ready ?? stats?.rooms_clean ?? 0;
  const notReadyCount = stats?.rooms_not_ready ?? stats?.rooms_dirty ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-gray-900">{t('housekeeping_title')}</h2><p className="text-sm text-gray-500">{t('housekeeping_subtitle')}</p></div><button type="button" onClick={() => void runGenerate()} disabled={busyId === 'generate'} className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">{busyId === 'generate' ? t('housekeeping_generating') : t('housekeeping_generate_refresh')}</button></div>

      {stats && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{([
        [t('housekeeping_ready'), readyCount, 'bg-green-50 text-green-800'], [t('housekeeping_not_ready'), notReadyCount, 'bg-orange-50 text-orange-800'], [t('housekeeping_refresh_due'), stats.refresh_due, 'bg-yellow-50 text-yellow-800'], [t('housekeeping_full_service_due'), stats.full_service_due, 'bg-blue-50 text-blue-800'], [t('housekeeping_done_today'), stats.completed_today, 'bg-emerald-50 text-emerald-800'], [t('housekeeping_overdue'), stats.overdue, 'bg-gray-100 text-gray-800'],
      ] as const).map(([label, value, cls]) => <div key={label} className={`rounded-xl border border-gray-100 p-3 ${cls}`}><p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={taskAssignmentsEnabled} onChange={(event) => setTaskAssignmentsEnabled(event.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
          <span><span className="block text-sm font-semibold text-gray-900">Task Assignments</span><span className="block text-xs text-gray-500 mt-0.5">Enable individual task assignment to a specific housekeeper. When unchecked, every task remains available to any housekeeper.</span></span>
        </label>
        {taskAssignmentsEnabled && <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedHousekeeperId} onChange={(event) => setSelectedHousekeeperId(event.target.value)} className="min-w-[220px] px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
              <option value="">Any housekeeper — unassign</option>
              {housekeepers.map((employee) => <option key={employee.id} value={employee.id}>{employeeName(employee)}</option>)}
            </select>
            <input value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)} placeholder="Filter by room number" className="w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg" />
            <button type="button" onClick={() => void loadHousekeepers()} className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">Refresh housekeepers</button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <label className="inline-flex items-center gap-2 font-medium text-gray-700 cursor-pointer"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4 rounded border-gray-300 text-orange-500" /> Select visible rooms</label>
            <span className="text-gray-500">{selectedTaskIds.length} selected</span>
            <button type="button" disabled={!selectedTaskIds.length || assignmentBusy} onClick={() => void assignSelectedTasks()} className="px-4 py-2 text-xs font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">{assignmentBusy ? 'Saving…' : selectedHousekeeperId ? 'Assign selected tasks' : 'Make available to any housekeeper'}</button>
          </div>
          <p className="text-[11px] text-gray-400">Select one or multiple room tasks below, choose a housekeeper, then apply the assignment. Selecting “Any housekeeper” removes the individual assignment.</p>
        </div>}
      </div>

      <div className="flex flex-wrap gap-2">{views.map((v) => <button key={v.id} type="button" onClick={() => setView(v.id)} className={`px-3 py-1.5 text-xs font-medium rounded-full border ${view === v.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>{v.label}</button>)}</div>
      {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{message}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {loading ? <p className="text-center text-gray-400 py-12 text-sm">{t('housekeeping_loading')}</p> : tasks.length === 0 ? <div className="text-center py-12 text-sm text-gray-500 bg-white rounded-2xl border border-gray-200"><p className="mb-2">{t('housekeeping_no_tasks')}</p><p className="text-xs text-gray-400">{t('housekeeping_no_tasks_help')}</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleTasks.map((task) => {
          const roomLabel = getRoomDisplayName({ room_number: Number(task.room_number) || 0, room_name: task.room_name });
          const busy = busyId === task.id;
          return <div key={task.id} className={`bg-white rounded-2xl border shadow-sm p-4 space-y-3 ${taskAssignmentsEnabled && selectedTaskIds.includes(task.id) ? 'border-orange-400 ring-1 ring-orange-200' : 'border-gray-200'}`}>
            {taskAssignmentsEnabled && <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedTaskIds.includes(task.id)} onChange={() => toggleTask(task.id)} className="h-4 w-4 rounded border-gray-300 text-orange-500" /> Select room/task for assignment</label>}
            <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-gray-900">{roomLabel}</p>{task.guest_name && <p className="text-sm text-gray-600">{task.guest_name}</p>}</div><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : task.status === 'completed' ? 'bg-green-100 text-green-800' : task.status === 'skipped' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700'}`}>{task.status.replace('_', ' ')}</span></div>
            <div className="text-sm space-y-1"><p><span className="text-gray-400 text-xs">{t('housekeeping_service')}</span><br /><span className="font-medium">{taskTypeLabel(task.task_type, task.is_checkout)}</span></p><p className="text-xs text-gray-500">{t('housekeeping_scheduled')}: <span className="font-medium text-gray-700">{task.scheduled_date}</span>{' · '}{t('housekeeping_priority')}: <span className="capitalize">{task.priority}</span></p>{task.room_type && <p className="text-xs text-gray-500">Room type: <span className="font-medium text-gray-700">{task.room_type}</span></p>}<p className="text-xs text-gray-500">Assignment: <span className="font-medium text-gray-700">{task.assigned_staff_name || 'Any housekeeper'}</span></p>{task.inspection_status && <p className="text-xs text-gray-500">{t('housekeeping_inspection')}: <span className="capitalize">{task.inspection_status}</span></p>}{task.status === 'in_progress' && task.active_session && <p className="text-xs font-semibold text-blue-700">Active timer recovered from {new Date(task.active_session.started_at).toLocaleTimeString()}</p>}</div>
            <textarea value={noteDraft[task.id] ?? task.notes ?? ''} onChange={(e) => setNoteDraft((d) => ({ ...d, [task.id]: e.target.value }))} placeholder={t('rooms_notes')} rows={2} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none" />
            <div className="flex flex-wrap gap-2">
              {task.status === 'pending' && <button type="button" disabled={busy} onClick={() => void startService(task)} className="px-4 py-2 text-sm font-bold bg-blue-500 text-white rounded-lg disabled:opacity-50">{busy ? 'Starting…' : t('housekeeping_start')}</button>}
              {task.status === 'in_progress' && task.active_session && <button type="button" disabled={busy} onClick={() => resumeService(task)} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg disabled:opacity-50">Resume Service</button>}
              {task.status === 'pending' && task.task_type === 'refresh' && <button type="button" disabled={busy} onClick={() => void act(task, 'skip')} className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50">{t('housekeeping_skip')}</button>}
              {task.status === 'completed' && task.inspection_status === 'pending' && <><button type="button" disabled={busy} onClick={() => void act(task, 'approve')} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg disabled:opacity-50">{t('housekeeping_approve')}</button><button type="button" disabled={busy} onClick={() => void act(task, 'reject')} className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg disabled:opacity-50">{t('housekeeping_reject')}</button></>}
            </div>
          </div>;
        })}
      </div>}

      <HousekeepingPerformancePanel businessId={businessId} />

      {activeTask && activeSession && <HousekeepingServiceModal businessId={businessId} task={activeTask} session={activeSession} onClose={() => { setActiveTask(null); setActiveSession(null); }} onCompleted={async () => { setActiveTask(null); setActiveSession(null); setMessage('Service completed and timing recorded.'); await load(); }} />}
    </div>
  );
}

export default HousekeepingTab;
