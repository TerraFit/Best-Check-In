export type HousekeepingServiceType = 'refresh' | 'full_service' | 'deep_cleaning' | 'mattress_flip_air' | 'checkout_inspection';
export type HousekeepingServiceSessionStatus = 'active' | 'completed' | 'cancelled' | 'abandoned';
export type HousekeepingQualityResult = 'pending' | 'passed' | 'passed_with_minor_issue' | 'failed_rework_required';

export interface HousekeepingServiceSettings {
  id?: string;
  business_id: string;
  warning_minutes: number;
  final_countdown_seconds: number;
  voice_enabled: boolean;
  sound_enabled: boolean;
  allow_pause: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HousekeepingServiceTarget {
  id?: string;
  business_id: string;
  service_type: HousekeepingServiceType;
  room_type?: string | null;
  target_minutes: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HousekeepingServiceSession {
  id: string;
  business_id: string;
  housekeeping_task_id: string;
  room_id: string;
  booking_id?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
  service_type: HousekeepingServiceType;
  room_type_snapshot?: string | null;
  target_minutes_snapshot: number;
  warning_minutes_snapshot: number;
  started_at: string;
  completed_at?: string | null;
  actual_seconds?: number | null;
  status: HousekeepingServiceSessionStatus;
  checklist_completed_count: number;
  checklist_total_count: number;
  issues_reported_count: number;
  quality_result?: HousekeepingQualityResult | null;
  rework_started_at?: string | null;
  rework_completed_at?: string | null;
  rework_seconds?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HousekeepingTimerSnapshot {
  elapsedSeconds: number;
  remainingSeconds: number;
  targetSeconds: number;
  warningSeconds: number;
  finalCountdownSeconds: number;
  phase: 'normal' | 'warning' | 'final_countdown' | 'over_target';
}

export const DEFAULT_HOUSEKEEPING_SERVICE_SETTINGS: Omit<HousekeepingServiceSettings, 'business_id'> = {
  warning_minutes: 15,
  final_countdown_seconds: 5,
  voice_enabled: true,
  sound_enabled: true,
  allow_pause: false,
};

export const DEFAULT_HOUSEKEEPING_SERVICE_TARGETS: Array<{ service_type: HousekeepingServiceType; target_minutes: number }> = [
  { service_type: 'refresh', target_minutes: 45 },
  { service_type: 'full_service', target_minutes: 60 },
  { service_type: 'deep_cleaning', target_minutes: 120 },
  { service_type: 'mattress_flip_air', target_minutes: 30 },
  { service_type: 'checkout_inspection', target_minutes: 10 },
];

export function resolveHousekeepingTargetMinutes(serviceType: HousekeepingServiceType, roomType: string | null | undefined, targets: HousekeepingServiceTarget[]): number | null {
  const active = targets.filter((target) => target.active && target.service_type === serviceType);
  const normalized = roomType?.trim().toLowerCase();
  if (normalized) {
    const override = active.find((target) => target.room_type?.trim().toLowerCase() === normalized);
    if (override) return override.target_minutes;
  }
  return active.find((target) => !target.room_type)?.target_minutes ?? null;
}

export function getHousekeepingTimerSnapshot(startedAt: string, nowMs: number, targetMinutes: number, warningMinutes: number, finalCountdownSeconds: number): HousekeepingTimerSnapshot {
  const startedMs = new Date(startedAt).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
  const targetSeconds = Math.max(1, targetMinutes * 60);
  const warningSeconds = Math.max(0, warningMinutes * 60);
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  let phase: HousekeepingTimerSnapshot['phase'] = 'normal';
  if (elapsedSeconds >= targetSeconds) phase = 'over_target';
  else if (finalCountdownSeconds > 0 && remainingSeconds <= finalCountdownSeconds) phase = 'final_countdown';
  else if (warningSeconds > 0 && remainingSeconds <= warningSeconds) phase = 'warning';
  return { elapsedSeconds, remainingSeconds, targetSeconds, warningSeconds, finalCountdownSeconds, phase };
}
