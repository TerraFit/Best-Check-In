import { useCallback, useEffect, useState } from 'react';
import {
  completeHousekeepingService,
  fetchHousekeepingIssues,
  fetchHousekeepingTasks,
  ignoreHousekeepingTask,
  updateHousekeepingTask,
} from '../../services/housekeepingApi';
import type { HousekeepingTask } from '../../types/housekeeping';
import type { HousekeepingIssue } from '../../types/housekeepingIssues';
import { getAuthHeader, getEmployeeAuth } from '../../utils/auth';

interface Props { businessId: string; }

function elapsedLabel(from: string | null | undefined): string {
  if (!from) return 'Not recorded';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function waitingSince(task: HousekeepingTask): string | null {
  return task.created_at || (task.scheduled_date ? `${task.scheduled_date}T00:00:00` : null);
}

export default function AdminHousekeepingTaskActions({ businessId }: Props) {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [issues, setIssues] = useState<Record<string, HousekeepingIssue[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHousekeepingTasks({ businessId, view: 'pending' });
      setTasks(result.tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load pending housekeeping tasks.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  // Employee workflows remain in the employee portal; these controls are for the business dashboard.
  if (getEmployeeAuth()) return null;

  const toggleDetails = async (task: HousekeepingTask) => {
    if (expanded === task.id) { setExpanded(null); return; }
    setExpanded(task.id);
    const sessionId = task.active_session?.id;
    if (!sessionId || issues[task.id]) return;
    try {
      const rows = await fetchHousekeepingIssues({ businessId, sessionId });
      setIssues((current) => ({ ...current, [task.id]: rows }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load reported issues.');
    }
  };

  const complete = async (task: HousekeepingTask) => {
    if (busyId) return;
    const reason = window.prompt(
      task.active_session
        ? 'Optional note for the administrator completion record:'
        : 'Why is this pending task being marked complete by an administrator? This will be recorded in the task notes.',
      task.active_session ? '' : 'Completed by administrator',
    );
    if (reason === null) return;
    if (!task.active_session && !reason.trim()) {
      setError('Please enter a reason for completing a task that has not been started.');
      return;
    }
    if (task.active_session && (task.active_session.issues_reported_count || 0) > 0) {
      const openIssues = (issues[task.id] || []).filter((issue) => !['resolved', 'verified', 'dismissed'].includes(issue.status));
      if (!window.confirm(`This service has reported issues${openIssues.length ? ` (${openIssues.length} still open)` : ''}. Complete the service without closing those issues?`)) return;
    } else if (!window.confirm('Mark this housekeeping service as complete? The room will move to awaiting inspection, not directly to ready.')) return;

    setBusyId(task.id); setError(null); setNotice(null);
    try {
      if (task.active_session) {
        const session = task.active_session;
        await completeHousekeepingService({
          businessId,
          sessionId: session.id,
          checklistCompletedCount: session.checklist_completed_count || 0,
          checklistTotalCount: session.checklist_total_count || 0,
          issuesReportedCount: session.issues_reported_count || 0,
          notes: reason.trim() || session.notes || undefined,
        });
      } else {
        await updateHousekeepingTask({
          businessId,
          taskId: task.id,
          status: 'completed',
          notes: [task.notes, `Administrator completion: ${reason.trim()}`].filter(Boolean).join('\\n'),
        });
      }
      setNotice(`${task.room_name || `Room ${task.room_number ?? ''}`}: housekeeping marked complete and sent for inspection.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to complete housekeeping task.');
      await load();
    } finally { setBusyId(null); }
  };

  const skip = async (task: HousekeepingTask) => {
    if (busyId) return;
    const reason = window.prompt(
      task.active_session
        ? 'Reason for cancelling this active service (required; the session history will be retained):'
        : 'Reason for skipping this pending task (required):',
      '',
    );
    if (reason === null) return;
    if (!reason.trim()) { setError('A reason is required to skip a housekeeping task.'); return; }
    if (!window.confirm(task.active_session
      ? 'Cancel this active service? Its session will remain in history and the task will return to pending.'
      : 'Skip this pending housekeeping task? The reason will be recorded in its audit history.')) return;

    setBusyId(task.id); setError(null); setNotice(null);
    try {
      if (task.active_session) {
        const response = await fetch('/.netlify/functions/cancel-housekeeping-service', {
          method: 'POST',
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, sessionId: task.active_session.id, reason: `Administrator skip: ${reason.trim()}` }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      } else {
        await ignoreHousekeepingTask({ businessId, taskId: task.id, reason: 'Other', details: `Administrator skip: ${reason.trim()}` });
      }
      setNotice(`${task.room_name || `Room ${task.room_number ?? ''}`}: task skipped/cancelled and recorded.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to skip housekeeping task.');
      await load();
    } finally { setBusyId(null); }
  };

  return <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold text-gray-900">Pending housekeeping · administrator actions</h3>
        <p className="mt-1 text-sm text-gray-500">Inspect who started a service, how long it has been running or waiting, and any reported issues. These controls do not alter the staff task workflow.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading || Boolean(busyId)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50">Refresh tasks</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {loading ? <p className="py-3 text-sm text-gray-500">Loading pending tasks…</p> : !tasks.length ? <p className="py-3 text-sm text-gray-500">No pending or in-progress housekeeping tasks.</p> : <div className="space-y-2">
      {tasks.map((task) => {
        const session = task.active_session;
        const taskIssues = issues[task.id] || [];
        const openIssues = taskIssues.filter((issue) => !['resolved', 'verified', 'dismissed'].includes(issue.status));
        const started = session?.started_at || task.started_at;
        const waiting = waitingSince(task);
        const room = task.room_name || `Room ${task.room_number ?? '—'}`;
        return <article key={task.id} className="rounded-xl border border-gray-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{room}</p>
              <p className="text-xs text-gray-500">{task.task_type === 'full_service' ? 'Full Service' : 'Refresh'} · Due {task.scheduled_date}{task.is_overdue ? ' · Overdue' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${session ? 'bg-blue-100 text-blue-800' : task.is_overdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{session ? 'In progress' : task.is_overdue ? 'Overdue · pending' : 'Pending'}</span>
              <button type="button" aria-label={`Show details for ${room}`} aria-expanded={expanded === task.id} title="Show task details" onClick={() => void toggleDetails(task)} className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400">i</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            {session ? <><span>Started by <strong>{session.employee_name || 'Unknown employee'}</strong></span><span>Running <strong>{elapsedLabel(started)}</strong></span><span>Checklist <strong>{session.checklist_completed_count || 0}/{session.checklist_total_count || 0}</strong></span></> : <span>Waiting <strong>{elapsedLabel(waiting)}</strong></span>}
            <span>Assigned: <strong>{task.assigned_staff_name || 'Any housekeeper'}</strong></span>
            {(session?.issues_reported_count || 0) > 0 && <span className="font-semibold text-orange-700">{session?.issues_reported_count} issue(s) reported</span>}
          </div>
          {expanded === task.id && <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
            <div className="grid gap-1 sm:grid-cols-2">
              <p>Scheduled: <strong>{task.scheduled_date}</strong></p>
              <p>Task created: <strong>{task.created_at ? new Date(task.created_at).toLocaleString() : 'Not recorded'}</strong></p>
              <p>Started: <strong>{started ? new Date(started).toLocaleString() : 'Not started'}</strong></p>
              {session && <p>Employee: <strong>{session.employee_name || 'Unknown employee'}</strong></p>}
              {session && <p>Service elapsed: <strong>{elapsedLabel(started)}</strong></p>}
              {session && <p>Checklist progress: <strong>{session.checklist_completed_count || 0} / {session.checklist_total_count || 0}</strong></p>}
            </div>
            <div className="border-t border-gray-200 pt-2">
              <p className="font-semibold">Reported issues</p>
              {!session ? <p className="mt-1 text-gray-500">No service session has been started, so no session-linked issues are available.</p>
                : !issues[task.id] ? <p className="mt-1 text-gray-500">Loading issues…</p>
                : !taskIssues.length ? <p className="mt-1 text-gray-500">No issues reported for this session.</p>
                : taskIssues.map((issue) => <div key={issue.id} className="mt-2 rounded-md border border-gray-200 bg-white p-2">
                  <div className="flex flex-wrap items-center gap-2"><strong>{issue.category}: {issue.issue_type}</strong><span className="capitalize">{issue.priority}</span><span className="capitalize">{issue.status.replaceAll('_', ' ')}</span>{issue.maintenance_requested && <span className="text-blue-700">Maintenance requested</span>}</div>
                  <p className="mt-1">{issue.other_description || issue.description || 'No additional details.'}</p>
                  <p className="mt-1 text-gray-500">Reported by {issue.employee_name || 'Housekeeping'} · {new Date(issue.reported_at).toLocaleString()}</p>
                </div>)}
              {openIssues.length > 0 && <p className="mt-2 font-semibold text-orange-700">{openIssues.length} issue(s) remain open. Completing housekeeping does not resolve these issues.</p>}
            </div>
          </div>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(busyId)} onClick={() => void complete(task)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busyId === task.id ? 'Working…' : 'Complete'}</button>
            <button type="button" disabled={Boolean(busyId)} onClick={() => void skip(task)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50">Skip</button>
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
