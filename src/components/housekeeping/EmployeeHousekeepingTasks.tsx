import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHousekeepingTasks, startHousekeepingService } from '../../services/housekeepingApi';
import type { HousekeepingTask } from '../../types/housekeeping';
import type { HousekeepingServiceSession } from '../../types/housekeepingServicePerformance';
import HousekeepingServiceModal from './HousekeepingServiceModal';
import { hasPermission } from '../../services/rbacService';
import type { PermissionPrincipal } from '../../services/rbacService';

interface Props {
  businessId: string;
  principal: PermissionPrincipal;
}

type TaskBucket = 'pending' | 'behind' | 'completed_today';

function localDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function bucketForTask(task: HousekeepingTask, today: string): TaskBucket | null {
  if (task.status === 'completed') {
    if (task.completed_at?.slice(0, 10) === today || task.scheduled_date === today) return 'completed_today';
    return null;
  }
  if (task.status === 'pending' || task.status === 'in_progress') {
    return task.scheduled_date < today ? 'behind' : 'pending';
  }
  return null;
}

function taskLabel(task: HousekeepingTask): string {
  if (task.task_type === 'full_service') return task.is_checkout ? 'Full Service · Checkout' : 'Full Service';
  return 'Refresh';
}

export default function EmployeeHousekeepingTasks({ businessId, principal }: Props) {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [selectedSession, setSelectedSession] = useState<HousekeepingServiceSession | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);

  const canStart = hasPermission(principal, 'canStartHousekeepingTask');
  const canComplete = hasPermission(principal, 'canCompleteHousekeepingTask');
  const canExecute = canStart || canComplete;

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHousekeepingTasks({ businessId, view: 'today' });
      setTasks(result.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load housekeeping tasks.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const today = localDateString();
  const buckets = useMemo(() => {
    const grouped: Record<TaskBucket, HousekeepingTask[]> = {
      pending: [],
      behind: [],
      completed_today: [],
    };
    for (const task of tasks) {
      const bucket = bucketForTask(task, today);
      if (bucket) grouped[bucket].push(task);
    }
    return grouped;
  }, [tasks, today]);

  const openSession = (task: HousekeepingTask, session: HousekeepingServiceSession) => {
    setSelectedTask(task);
    setSelectedSession(session);
  };

  const startTask = async (task: HousekeepingTask) => {
    setStartingTaskId(task.id);
    setError(null);
    try {
      const result = await startHousekeepingService({
        businessId,
        taskId: task.id,
        serviceType: task.task_type,
      });
      openSession(task, result.session);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start this service.');
    } finally {
      setStartingTaskId(null);
    }
  };

  const renderTask = (task: HousekeepingTask, bucket: TaskBucket) => {
    const activeSession = task.active_session;
    const isAssignedToEmployee = Boolean(
      task.assigned_staff_id && task.assigned_staff_id === principal.employeeId
    );
    const canStartThisTask = canStart && (isAssignedToEmployee || !task.assigned_staff_id);
    const statusLabel = bucket === 'behind' ? 'Behind' : bucket === 'completed_today' ? 'Completed Today' : task.status === 'in_progress' ? 'In Progress' : 'Pending';

    return (
      <li key={task.id} className="border border-stone-200 rounded-2xl p-4 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-stone-900">
                {task.room_number ? `Room ${task.room_number}` : task.room_id}
                {task.room_name ? ` · ${task.room_name}` : ''}
              </span>
              <span className="px-2 py-1 rounded-full bg-stone-100 text-[10px] uppercase font-bold text-stone-600">
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-stone-600 mt-1">{taskLabel(task)}</p>
            {task.guest_name && <p className="text-xs text-stone-400 mt-1">{task.guest_name}</p>}
            {task.assigned_staff_name && (
              <p className="text-xs text-stone-400 mt-1">Assigned to {task.assigned_staff_name}</p>
            )}
            {activeSession?.employee_name && (
              <p className="text-xs text-amber-700 mt-1">In service · {activeSession.employee_name}</p>
            )}
          </div>

          {bucket !== 'completed_today' && canExecute && (
            <div className="shrink-0">
              {activeSession && task.status === 'in_progress' ? (
                <button
                  type="button"
                  onClick={() => openSession(task, activeSession)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600"
                >
                  Resume Service
                </button>
              ) : canStartThisTask ? (
                <button
                  type="button"
                  disabled={startingTaskId === task.id}
                  onClick={() => void startTask(task)}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-800 disabled:opacity-50"
                >
                  {startingTaskId === task.id ? 'Starting…' : 'Start'}
                </button>
              ) : (
                <span className="text-xs text-stone-400">Assigned to another employee</span>
              )}
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-stone-900">Today's Tasks</h3>
            <p className="text-sm text-stone-500">Start, perform and complete housekeeping from the Employee Portal.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadTasks()}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:border-stone-300 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <p className="text-sm text-stone-400 py-6 text-center">Loading housekeeping tasks…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No housekeeping tasks scheduled for today.</p>
        ) : (
          <div className="space-y-6">
            {(
              [
                ['behind', 'Behind', 'bg-red-50 border-red-200', buckets.behind],
                ['pending', 'Pending', 'bg-amber-50 border-amber-200', buckets.pending],
                ['completed_today', 'Completed Today', 'bg-green-50 border-green-200', buckets.completed_today],
              ] as const
            ).map(([key, title, tone, group]) => (
              <section key={key}>
                <div className={`rounded-xl border px-4 py-2 mb-2 ${tone}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-stone-800">{title}</h4>
                    <span className="text-xs font-bold text-stone-500">{group.length}</span>
                  </div>
                </div>
                {group.length ? (
                  <ul className="space-y-2">{group.map((task) => renderTask(task, key))}</ul>
                ) : (
                  <p className="text-xs text-stone-400 px-2">None</p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      {selectedTask && selectedSession && (
        <HousekeepingServiceModal
          businessId={businessId}
          task={selectedTask}
          session={selectedSession}
          onClose={() => {
            setSelectedTask(null);
            setSelectedSession(null);
          }}
          onCompleted={async () => {
            setSelectedTask(null);
            setSelectedSession(null);
            await loadTasks();
          }}
        />
      )}
    </>
  );
}
