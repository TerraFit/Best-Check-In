// Staff / business Housekeeping workflow

import { useCallback, useEffect, useState } from 'react';
import { getRoomDisplayName } from '../../services/roomDisplayService';
import {
  fetchHousekeepingTasks,
  updateHousekeepingTask,
  generateHousekeepingTasks,
} from '../../services/housekeepingApi';
import { taskTypeLabel } from '../../services/housekeepingScheduleEngine';
import type {
  HousekeepingTask,
  HousekeepingDashboardStats,
} from '../../types/housekeeping';

interface Props {
  businessId: string;
}

type ViewFilter = 'today' | 'pending' | 'completed' | 'all';

export function HousekeepingTab({ businessId }: Props) {
  const [view, setView] = useState<ViewFilter>('today');
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [stats, setStats] = useState<HousekeepingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHousekeepingTasks({ businessId, view });
      setTasks(data.tasks);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [businessId, view]);

  useEffect(() => {
    load();
  }, [load]);

  const runGenerate = async () => {
    setBusyId('generate');
    setMessage(null);
    setError(null);
    try {
      const result = await generateHousekeepingTasks({
        businessId,
        regenerate: true,
      });
      const detail = [
        result.message,
        result.today ? `Today (SAST): ${result.today}` : null,
        typeof result.bookings_processed === 'number'
          ? `Bookings processed: ${result.bookings_processed}`
          : null,
        typeof result.created === 'number' ? `Created: ${result.created}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      setMessage(detail || `Generated ${result.created ?? 0} task(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed');
    } finally {
      setBusyId(null);
    }
  };

  const act = async (
    task: HousekeepingTask,
    action: 'start' | 'complete' | 'skip' | 'approve' | 'reject'
  ) => {
    setBusyId(task.id);
    setError(null);
    try {
      if (action === 'start') {
        await updateHousekeepingTask({
          businessId,
          taskId: task.id,
          status: 'in_progress',
        });
      } else if (action === 'complete') {
        await updateHousekeepingTask({
          businessId,
          taskId: task.id,
          status: 'completed',
          notes: noteDraft[task.id] ?? task.notes ?? undefined,
        });
      } else if (action === 'skip') {
        await updateHousekeepingTask({
          businessId,
          taskId: task.id,
          status: 'skipped',
          notes: noteDraft[task.id] ?? task.notes ?? undefined,
        });
      } else if (action === 'approve') {
        await updateHousekeepingTask({
          businessId,
          taskId: task.id,
          inspection_status: 'approved',
        });
      } else if (action === 'reject') {
        await updateHousekeepingTask({
          businessId,
          taskId: task.id,
          inspection_status: 'rejected',
          status: 'in_progress',
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const views: { id: ViewFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Housekeeping</h2>
          <p className="text-sm text-gray-500">Room-centric tasks from the intelligent schedule engine</p>
        </div>
        <button
          type="button"
          onClick={runGenerate}
          disabled={busyId === 'generate'}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          {busyId === 'generate' ? 'Generating…' : 'Generate / Refresh Schedule'}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(
            [
              ['Clean', stats.rooms_clean, 'bg-green-50 text-green-800'],
              ['Dirty', stats.rooms_dirty, 'bg-red-50 text-red-800'],
              ['Refresh Due', stats.refresh_due, 'bg-yellow-50 text-yellow-800'],
              ['Full Service Due', stats.full_service_due, 'bg-blue-50 text-blue-800'],
              ['Done Today', stats.completed_today, 'bg-emerald-50 text-emerald-800'],
              ['Overdue', stats.overdue, 'bg-gray-100 text-gray-800'],
            ] as const
          ).map(([label, value, cls]) => (
            <div key={label} className={`rounded-xl border border-gray-100 p-3 ${cls}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
              view === v.id
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-12 text-sm">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500 bg-white rounded-2xl border border-gray-200">
          <p className="mb-2">No tasks in this view.</p>
          <p className="text-xs text-gray-400">
            Assign rooms to bookings, then click Generate / Refresh Schedule.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const roomLabel = getRoomDisplayName({
              room_number: Number(task.room_number) || 0,
              room_name: task.room_name,
            });
            const busy = busyId === task.id;
            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{roomLabel}</p>
                    {task.guest_name && (
                      <p className="text-sm text-gray-600">{task.guest_name}</p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      task.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : task.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'skipped'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-gray-400 text-xs">Service</span>
                    <br />
                    <span className="font-medium">
                      {taskTypeLabel(task.task_type, task.is_checkout)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Scheduled: <span className="font-medium text-gray-700">{task.scheduled_date}</span>
                    {' · '}
                    Priority: <span className="capitalize">{task.priority}</span>
                  </p>
                  {task.assigned_staff_name && (
                    <p className="text-xs text-gray-500">Staff: {task.assigned_staff_name}</p>
                  )}
                  {task.inspection_status && (
                    <p className="text-xs text-gray-500">
                      Inspection: <span className="capitalize">{task.inspection_status}</span>
                    </p>
                  )}
                </div>

                <textarea
                  value={noteDraft[task.id] ?? task.notes ?? ''}
                  onChange={(e) =>
                    setNoteDraft((d) => ({ ...d, [task.id]: e.target.value }))
                  }
                  placeholder="Notes"
                  rows={2}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none"
                />

                <div className="flex flex-wrap gap-2">
                  {task.status === 'pending' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(task, 'start')}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg disabled:opacity-50"
                    >
                      Start
                    </button>
                  )}
                  {(task.status === 'pending' || task.status === 'in_progress') && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(task, 'complete')}
                      className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg disabled:opacity-50"
                    >
                      Complete
                    </button>
                  )}
                  {task.status === 'pending' && task.task_type === 'refresh' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(task, 'skip')}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                    >
                      Skip
                    </button>
                  )}
                  {task.status === 'completed' && task.inspection_status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(task, 'approve')}
                        className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg disabled:opacity-50"
                      >
                        Approve inspection
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(task, 'reject')}
                        className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HousekeepingTab;
