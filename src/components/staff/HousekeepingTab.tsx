// src/components/staff/HousekeepingTab.tsx
// ✅ COMPLETE: Staff housekeeping task list

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Check, X, Clock, User, DoorOpen, 
  Calendar, AlertCircle, Filter, Search
} from 'lucide-react';
import { 
  getTaskIcon, 
  getTaskColor, 
  getStatusDisplayText,
  getTaskEstimatedMinutes
} from '../../services/housekeepingService';

interface HousekeepingTask {
  id: string;
  business_id: string;
  booking_id: string;
  room_number: string;
  guest_name: string;
  task_type: 'refresh' | 'full_service';
  scheduled_date: string;
  stay_night: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  assigned_staff_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_staff_name?: string;
  isCheckout?: boolean;
}

interface HousekeepingTabProps {
  businessId: string;
  session: {
    user: {
      id: string;
      full_name: string;
      role: 'owner' | 'EmployeeOverview';
      business_id: string;
    };
  };
}

export function HousekeepingTab({ businessId, session }: HousekeepingTabProps) {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'pending'>('today');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const isEmployee = session.user.role === 'EmployeeOverview';
  const canComplete = isEmployee || session.user.role === 'owner';

  const fetchTasks = useCallback(async () => {
    if (!businessId) return;

    setLoading(true);
    setError(null);

    try {
      let token = null;
      try {
        const authStr = localStorage.getItem('fastcheckin_auth');
        if (authStr) {
          const auth = JSON.parse(authStr);
          token = auth.token;
        }
      } catch (e) {}

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const today = new Date().toISOString().split('T')[0];
      let url = `/.netlify/functions/get-housekeeping-tasks?businessId=${businessId}`;

      if (filter === 'today') {
        url += `&scheduledDate=${today}`;
      } else if (filter === 'pending') {
        url += `&status=pending`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch tasks:', errorText);
        setError(`Failed to fetch tasks: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        setTasks(data.data);
      } else if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [businessId, filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = tasks.filter(task => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      task.room_number?.toLowerCase().includes(term) ||
      task.guest_name?.toLowerCase().includes(term) ||
      task.task_type?.toLowerCase().includes(term)
    );
  });

  const handleComplete = async (taskId: string) => {
    if (!canComplete) {
      alert('You do not have permission to complete tasks');
      return;
    }

    setCompleting(true);
    try {
      let token = null;
      try {
        const authStr = localStorage.getItem('fastcheckin_auth');
        if (authStr) {
          const auth = JSON.parse(authStr);
          token = auth.token;
        }
      } catch (e) {}

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/.netlify/functions/update-housekeeping-task', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskId,
          status: 'completed',
          completedBy: session.user.id,
          completedByName: session.user.full_name,
          notes: notes || undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      await fetchTasks();
      setSelectedTask(null);
      setShowNotesModal(false);
      setNotes('');
    } catch (err) {
      console.error('Error completing task:', err);
      alert('Failed to complete task. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const getFilteredCount = () => {
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const today = tasks.filter(t => {
      const todayStr = new Date().toISOString().split('T')[0];
      return t.scheduled_date === todayStr && (t.status === 'pending' || t.status === 'in_progress');
    });
    return { pending: pending.length, today: today.length, total: tasks.length };
  };

  const counts = getFilteredCount();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-sm text-stone-500">Loading housekeeping tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 leading-none flex items-center gap-2">
            🧹 Housekeeping Tasks
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            {counts.pending} pending tasks • {counts.today} tasks today • {counts.total} total
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-stone-100 rounded-xl p-1">
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === 'today'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === 'all'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              All
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none w-40 bg-white"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={fetchTasks} className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium">
            Retry
          </button>
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center">
          <div className="text-5xl mb-4">🧹</div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No housekeeping tasks</h3>
          <p className="text-sm text-stone-400">
            {filter === 'today' && 'No tasks scheduled for today'}
            {filter === 'pending' && 'No pending tasks'}
            {filter === 'all' && 'No tasks found'}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 text-sm text-amber-500 hover:text-amber-600 font-medium"
            >
              View all tasks →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isCancelled = task.status === 'cancelled';
            const isSkipped = task.status === 'skipped';
            const isPending = !isCompleted && !isCancelled && !isSkipped;
            const estimatedMinutes = getTaskEstimatedMinutes(task.task_type, task.isCheckout || false);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border p-4 transition-all ${
                  isCompleted
                    ? 'border-green-200 opacity-70'
                    : isCancelled || isSkipped
                    ? 'border-red-200 opacity-50'
                    : 'border-stone-200 hover:border-amber-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${getTaskColor(task.task_type)}`}>
                      <span className="text-xl">{getTaskIcon(task.task_type)}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-stone-900 truncate">
                          Room {task.room_number}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.task_type === 'refresh'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {task.task_type === 'refresh' ? '✨ Refresh' : '🧺 Full Service'}
                          {task.isCheckout && ' (Checkout)'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-green-100 text-green-700'
                            : isCancelled || isSkipped
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {getStatusDisplayText(task.status)}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          ⏱️ {estimatedMinutes} min
                        </span>
                      </div>

                      {task.guest_name && (
                        <p className="text-sm text-stone-600 flex items-center gap-1 mt-0.5">
                          <User size={12} className="text-stone-400" />
                          {task.guest_name}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-1 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(task.scheduled_date).toLocaleDateString('en-ZA', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span>Night {task.stay_night}</span>
                        {task.assigned_staff_name && (
                          <span>👤 {task.assigned_staff_name}</span>
                        )}
                      </div>

                      {task.notes && (
                        <p className="text-xs text-stone-500 mt-1 italic">{task.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {isPending && canComplete && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setNotes('');
                            setShowNotesModal(true);
                          }}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                        >
                          <Check size={14} /> Complete
                        </button>
                      </>
                    )}
                    {isCompleted && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <Check size={14} /> Done
                      </span>
                    )}
                    {isCancelled && (
                      <span className="text-xs text-red-500 font-medium">Cancelled</span>
                    )}
                    {isSkipped && (
                      <span className="text-xs text-stone-500 font-medium">Skipped</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNotesModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  {getTaskIcon(selectedTask.task_type)}
                  Complete Task
                </h3>
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Room</span>
                    <span className="font-semibold text-stone-900">{selectedTask.room_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Guest</span>
                    <span className="font-semibold text-stone-900">{selectedTask.guest_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Task</span>
                    <span className={`font-semibold ${
                      selectedTask.task_type === 'refresh' ? 'text-blue-600' : 'text-amber-600'
                    }`}>
                      {selectedTask.task_type === 'refresh' ? '✨ Refresh' : '🧺 Full Service'}
                      {selectedTask.isCheckout && ' (Checkout)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Date</span>
                    <span className="font-semibold text-stone-900">
                      {new Date(selectedTask.scheduled_date).toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Estimated Time</span>
                    <span className="font-semibold text-stone-900">
                      {getTaskEstimatedMinutes(selectedTask.task_type, selectedTask.isCheckout || false)} min
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this task..."
                    rows={3}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleComplete(selectedTask.id)}
                  disabled={completing}
                  className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {completing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Complete Task
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HousekeepingTab;
