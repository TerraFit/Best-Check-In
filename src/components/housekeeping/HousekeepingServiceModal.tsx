import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getChecklistItemIds,
  getHousekeepingChecklist,
} from '../../services/housekeepingServiceDefinitions';
import { updateHousekeepingTask } from '../../services/housekeepingApi';
import type {
  HousekeepingServiceSession,
  HousekeepingTask,
} from '../../types/housekeeping';

interface Props {
  businessId: string;
  task: HousekeepingTask;
  session: HousekeepingServiceSession;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function playBeep() {
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch {
    // Audio is an optional enhancement; visual timer remains authoritative.
  }
}

function speak(message: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Browser speech support varies; never let it interrupt housekeeping work.
  }
}

export default function HousekeepingServiceModal({
  businessId,
  task,
  session,
  onClose,
  onCompleted,
}: Props) {
  const checklist = useMemo(() => getHousekeepingChecklist(task.task_type), [task.task_type]);
  const itemIds = useMemo(() => getChecklistItemIds(task.task_type), [task.task_type]);
  const [checked, setChecked] = useState<Record<string, boolean>>(session.checklist_state || {});
  const [issueCount, setIssueCount] = useState(session.issue_count || 0);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000))
  );
  const warnedRef = useRef(false);
  const exceededRef = useRef(false);

  const target = Math.max(1, session.target_duration_seconds);
  const remaining = target - elapsed;
  const warningAt = Math.max(0, target - session.warning_threshold_seconds);
  const countdownAt = Math.max(0, target - session.final_countdown_seconds);
  const progressCount = itemIds.filter((id) => checked[id]).length;
  const complete = progressCount === itemIds.length;
  const overTarget = elapsed >= target;
  const finalCountdown = !overTarget && elapsed >= countdownAt;
  const warning = !overTarget && elapsed >= warningAt;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [session.started_at]);

  useEffect(() => {
    if (muted) return;
    if (warning && !warnedRef.current && session.warning_threshold_seconds > 0) {
      warnedRef.current = true;
      if (session.warning_threshold_seconds >= 60) {
        const minutes = Math.round(session.warning_threshold_seconds / 60);
        speak(`${minutes} minutes remaining.`);
      }
      playBeep();
    }
    if (overTarget && !exceededRef.current) {
      exceededRef.current = true;
      speak('Target service time exceeded.');
    }
  }, [muted, overTarget, warning, session.warning_threshold_seconds]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const persistChecklist = async (next: Record<string, boolean>, nextIssueCount = issueCount) => {
    setSaving(true);
    try {
      await updateHousekeepingTask({
        businessId,
        taskId: task.id,
        checklist_state: next,
        issue_count: nextIssueCount,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    void persistChecklist(next);
  };

  const reportIssue = (label: string) => {
    const description = window.prompt(`Report issue found: ${label}`);
    if (!description?.trim()) return;
    const nextIssueCount = issueCount + 1;
    setIssueCount(nextIssueCount);
    void updateHousekeepingTask({
      businessId,
      taskId: task.id,
      checklist_state: checked,
      issue_count: nextIssueCount,
      notes: `${task.notes ? `${task.notes}\n` : ''}Issue: ${label} — ${description.trim()}`,
    });
  };

  const completeService = async () => {
    if (!complete) return;
    setCompleting(true);
    try {
      await updateHousekeepingTask({
        businessId,
        taskId: task.id,
        status: 'completed',
        checklist_state: checked,
        issue_count: issueCount,
      });
      await onCompleted();
    } finally {
      setCompleting(false);
    }
  };

  const timerClass = overTarget
    ? 'bg-red-50 border-red-300 text-red-800'
    : finalCountdown
      ? 'bg-red-50 border-red-300 text-red-700'
      : warning
        ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
        : 'bg-green-50 border-green-300 text-green-800';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl max-h-[95vh] overflow-hidden bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Housekeeping Service</p>
            <h2 className="text-xl font-bold text-gray-900">
              Room {task.room_number ?? '—'}{task.room_name ? ` · ${task.room_name}` : ''}
            </h2>
            <p className="text-sm text-gray-500">
              {task.task_type === 'full_service' ? 'Full Service' : 'Refresh'}
              {task.room_type ? ` · ${task.room_type}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-11 h-11 rounded-full bg-gray-100 text-gray-600 text-xl" aria-label="Close">
            ×
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className={`rounded-2xl border-2 p-4 ${timerClass}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                  {overTarget ? 'OVER TARGET' : finalCountdown ? 'FINAL COUNTDOWN' : warning ? 'WARNING' : 'TIME REMAINING'}
                </p>
                <p className="text-4xl sm:text-5xl font-black tabular-nums leading-none mt-1">
                  {overTarget ? `+${formatDuration(elapsed - target)}` : formatDuration(remaining)}
                </p>
              </div>
              <div className="text-right text-xs font-medium">
                <p>Target</p>
                <p className="text-base font-bold tabular-nums">{formatDuration(target)}</p>
                <p className="mt-2">Elapsed {formatDuration(elapsed)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span>{progressCount} / {itemIds.length} checklist items</span>
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                className="px-3 py-1.5 rounded-full bg-white/80 border border-current/20 font-semibold"
              >
                {muted ? '🔇 Muted' : '🔊 Voice & sound'}
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-5">
          {checklist.map((section) => {
            const sectionDone = section.items.filter((item) => checked[item.id]).length;
            return (
              <section key={section.id} className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{section.title}</h3>
                  <span className="text-xs font-semibold text-gray-500">{sectionDone} / {section.items.length}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {section.items.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-center gap-3 min-h-[58px]">
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className={`shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-lg ${
                          checked[item.id]
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-white border-gray-300 text-transparent'
                        }`}
                        aria-label={checked[item.id] ? `Uncheck ${item.label}` : `Check ${item.label}`}
                      >
                        ✓
                      </button>
                      <span className={`flex-1 text-sm ${checked[item.id] ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {item.label}
                      </span>
                      {item.issueReportable && (
                        <button
                          type="button"
                          onClick={() => reportIssue(item.label)}
                          className="shrink-0 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-orange-200 text-orange-700 bg-orange-50"
                        >
                          Report issue
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {issueCount > 0 && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
              <strong>{issueCount}</strong> issue{issueCount === 1 ? '' : 's'} recorded during this service.
            </div>
          )}
          {saving && <p className="text-xs text-gray-400 text-center">Saving service progress…</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500">
            Timer is calculated from the server-recorded start time and survives refresh/sleep.
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700">
              Close
            </button>
            <button
              type="button"
              disabled={!complete || completing}
              onClick={() => void completeService()}
              className="px-5 py-3 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {completing ? 'Completing…' : complete ? 'Complete Service' : `${itemIds.length - progressCount} items remaining`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
