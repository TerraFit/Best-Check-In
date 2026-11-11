import { useState } from 'react';
import {
  completeHousekeepingService,
  fetchHousekeepingIssues,
  ignoreHousekeepingTask,
  updateHousekeepingTask,
} from '../../services/housekeepingApi';
import type { HousekeepingTask } from '../../types/housekeeping';
import type { HousekeepingIssue } from '../../types/housekeepingIssues';
import { getAuthHeader, getEmployeeAuth } from '../../utils/auth';

interface Props {
  businessId: string;
  task: HousekeepingTask;
  onAction: () => Promise<void>;
}

function elapsedLabel(from: string | null | undefined): string {
  if (!from) return 'Not recorded';
  const timestamp = new Date(from).getTime();
  if (!Number.isFinite(timestamp)) return 'Not recorded';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

export default function AdminHousekeepingTaskActions({ businessId, task, onAction }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [issues, setIssues] = useState<HousekeepingIssue[] | null>(null);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep administrator controls out of the employee portal.
  if (getEmployeeAuth() || !['pending', 'in_progress'].includes(task.status)) return null;

  const session = task.active_session;
  const started = session?.started_at || task.started_at;
  const waitingFrom = task.created_at || (task.scheduled_date ? `${task.scheduled_date}T00:00:00` : null);

  const toggleDetails = async () => {
    const next = !expanded;
    setExpanded(next);
    if (!next || !session?.id || issues !== null || loadingIssues) return;
    setLoadingIssues(true);
    try {
      const rows = await fetchHousekeepingIssues({ businessId, sessionId: session.id });
      setIssues(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load reported issues.');
    } finally {
      setLoadingIssues(false);
    }
  };

  const complete = async () => {
    if (busy) return;
    const reason = window.prompt(
      session
        ? 'Optional note for the administrator completion record:'
        : 'Why is this task being marked complete by an administrator? This will be recorded in the task notes.',
      session ? '' : 'Completed by administrator',
    );
    if (reason === null) return;
    if (!session && !reason.trim()) {
      setError('Please enter a reason for the administrator completion override.');
      return;
    }
    const openIssues = (issues || []).filter((issue) => !['resolved', 'verified', 'dismissed'].includes(issue.status));
    if (session && (session.issues_reported_count || 0) > 0) {
      if (!window.confirm(`This service has reported issues${openIssues.length ? ` (${openIssues.length} still open)` : ''}. Complete the service without closing those issues?`)) return;
    } else if (!window.confirm('Mark this housekeeping service as complete? The room will move to awaiting inspection, not directly to ready.')) return;

    setBusy(true);
    setError(null);
    try {
      if (session) {
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
      await onAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to complete housekeeping task.');
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (busy) return;
    if (task.status === 'in_progress' && !session) {
      setError('This task is marked in progress but has no active session. Refresh or investigate it before skipping; its execution history must not be overwritten.');
      return;
    }
    const reason = window.prompt(
      session
        ? 'Reason for cancelling this active service (required; the session history will be retained):'
        : 'Reason for skipping this pending task (required):',
      '',
    );
    if (reason === null) return;
    if (!reason.trim()) {
      setError('A reason is required to skip a housekeeping task.');
      return;
    }
    if (!window.confirm(session
      ? 'Cancel this active service? Its session will remain in history and the task will return to pending.'
      : 'Skip this pending housekeeping task? The reason will be recorded in its audit history.')) return;

    setBusy(true);
    setError(null);
    try {
      if (session) {
        const response = await fetch('/.netlify/functions/cancel-housekeeping-service', {
          method: 'POST',
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, sessionId: session.id, reason: `Administrator skip: ${reason.trim()}` }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      } else {
        await ignoreHousekeepingTask({ businessId, taskId: task.id, reason: 'Other', details: `Administrator skip: ${reason.trim()}` });
      }
      await onAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to skip housekeeping task.');
    } finally {
      setBusy(false);
    }
  };

  const openIssues = (issues || []).filter((issue) => !['resolved', 'verified', 'dismissed'].includes(issue.status));

  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500">{session
        ? <>Started by <strong className="text-gray-700">{session.employee_name || 'Unknown employee'}</strong> · Running <strong className="text-gray-700">{elapsedLabel(started)}</strong></>
        : <>Waiting <strong className="text-gray-700">{elapsedLabel(waitingFrom)}</strong></>}
      </span>
      
      <button type="button" aria-label={expanded ? 'Hide task information' : 'Show task information'} aria-expanded={expanded} title="Task information and reported issues" onClick={() => void toggleDetails()} className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400">i</button>
      <button type="button" disabled={busy} onClick={() => void complete()} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Working…' : 'Complete'}</button>
      <button type="button" disabled={busy || (task.status === 'in_progress' && !session)} onClick={() => void skip()} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50">Skip</button>
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {expanded && <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 space-y-2">
      <div className="grid gap-1 sm:grid-cols-2">
        <p>Scheduled: <strong>{task.scheduled_date}</strong></p>
        <p>Task created: <strong>{task.created_at ? new Date(task.created_at).toLocaleString() : 'Not recorded'}</strong></p>
        <p>Started: <strong>{started ? new Date(started).toLocaleString() : 'Not started'}</strong></p>
        {session && <p>Checklist: <strong>{session.checklist_completed_count || 0} / {session.checklist_total_count || 0}</strong></p>}
      </div>
      <div className="border-t border-gray-200 pt-2">
        <p className="font-semibold">Reported issues</p>
        {!session ? <p className="mt-1 text-gray-500">No active service session; no session-linked issues are available.</p>
          : loadingIssues ? <p className="mt-1 text-gray-500">Loading issues…</p>
          : !issues?.length ? <p className="mt-1 text-gray-500">No issues reported for this session.</p>
          : issues.map((issue) => <div key={issue.id} className="mt-2 rounded-md border border-gray-200 bg-white p-2">
            <div className="flex flex-wrap items-center gap-2"><strong>{issue.category}: {issue.issue_type}</strong><span className="capitalize">{issue.priority}</span><span className="capitalize">{issue.status.replaceAll('_', ' ')}</span>{issue.maintenance_requested && <span className="text-blue-700">Maintenance requested</span>}</div>
            <p className="mt-1">{issue.other_description || issue.description || 'No additional details.'}</p>
            <p className="mt-1 text-gray-500">Reported by {issue.employee_name || 'Housekeeping'} · {new Date(issue.reported_at).toLocaleString()}</p>
          </div>)}
        {openIssues.length > 0 && <p className="mt-2 font-semibold text-orange-700">{openIssues.length} issue(s) remain open. Completing housekeeping does not resolve these issues.</p>}
      </div>
    </div>}
  </div>;
}
