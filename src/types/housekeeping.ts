// src/types/housekeeping.ts
// Phase 2 — Intelligent Housekeeping Engine + Service Performance

export type HousekeepingPolicy = 'eco' | 'standard' | 'premium' | 'custom';

export type HousekeepingTaskType = 'refresh' | 'full_service';

export type HousekeepingTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'cancelled';

export type InspectionStatus = 'pending' | 'approved' | 'rejected';

export type HousekeepingPriority =
  | 'vip'
  | 'early_arrival'
  | 'standard'
  | 'late_checkout'
  | 'maintenance';

export type HousekeepingServiceSessionStatus = 'active' | 'completed' | 'cancelled';

export interface HousekeepingSettings {
  id?: string;
  business_id: string;
  policy: HousekeepingPolicy;
  custom_refresh_interval: number;
  custom_full_interval: number;
  allow_skip_refresh: boolean;
  mandatory_checkout_fs: boolean;
  auto_generate: boolean;
  refresh_target_seconds: number;
  full_service_target_seconds: number;
  warning_threshold_seconds: number;
  final_countdown_seconds: number;
  warning_sound_enabled: boolean;
  voice_warning_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HousekeepingChecklistItem {
  id: string;
  label: string;
  issueReportable?: boolean;
}

export interface HousekeepingChecklistSection {
  id: string;
  title: string;
  items: HousekeepingChecklistItem[];
}

export interface HousekeepingServiceSession {
  id: string;
  business_id: string;
  task_id: string;
  room_id: string;
  room_type?: string | null;
  service_type: HousekeepingTaskType;
  target_duration_seconds: number;
  warning_threshold_seconds: number;
  final_countdown_seconds: number;
  started_at: string;
  completed_at?: string | null;
  actual_duration_seconds?: number | null;
  status: HousekeepingServiceSessionStatus;
  started_by?: string | null;
  completed_by?: string | null;
  checklist_state: Record<string, boolean>;
  issue_count: number;
  rework_required: boolean;
  rework_started_at?: string | null;
  rework_completed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HousekeepingTask {
  id: string;
  business_id: string;
  room_id: string;
  room_number?: number | null;
  room_name?: string | null;
  room_type?: string | null;
  booking_id?: string | null;
  guest_name?: string | null;
  task_type: HousekeepingTaskType;
  is_checkout: boolean;
  scheduled_date: string;
  priority: HousekeepingPriority;
  status: HousekeepingTaskStatus;
  assigned_staff_id?: string | null;
  assigned_staff_name?: string | null;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  inspection_status?: InspectionStatus | null;
  policy_used?: string | null;
  active_session?: HousekeepingServiceSession | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledService {
  scheduled_date: string;
  task_type: HousekeepingTaskType;
  is_checkout: boolean;
  night_index?: number;
}

export interface HousekeepingDashboardStats {
  /** Rooms with readiness = Ready (incl. legacy clean/inspected) */
  rooms_ready: number;
  /** Rooms with readiness = Not Ready (incl. legacy dirty / *_required) */
  rooms_not_ready: number;
  /** @deprecated use rooms_ready */
  rooms_clean: number;
  /** @deprecated use rooms_not_ready */
  rooms_dirty: number;
  refresh_due: number;
  full_service_due: number;
  completed_today: number;
  overdue: number;
}

export const DEFAULT_HOUSEKEEPING_SETTINGS: Omit<HousekeepingSettings, 'business_id'> = {
  policy: 'standard',
  custom_refresh_interval: 2,
  custom_full_interval: 3,
  allow_skip_refresh: true,
  mandatory_checkout_fs: true,
  auto_generate: true,
  refresh_target_seconds: 45 * 60,
  full_service_target_seconds: 60 * 60,
  warning_threshold_seconds: 15 * 60,
  final_countdown_seconds: 5,
  warning_sound_enabled: true,
  voice_warning_enabled: true,
};

/** Policy display order for Settings UI */
export const POLICY_OPTIONS: Array<{
  id: HousekeepingPolicy;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    id: 'eco',
    label: 'Eco',
    icon: '🌱',
    description: 'Lightest suitable service. Prefers Refresh; Full Service only when hygiene requires it.',
  },
  {
    id: 'standard',
    label: 'Standard',
    icon: '🏨',
    description: 'Balanced comfort. Prefers Full Service at meaningful midpoints.',
  },
  {
    id: 'premium',
    label: 'Premium',
    icon: '⭐',
    description: 'Full Service every occupied day, plus mandatory checkout Full Service.',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: '⚙️',
    description: 'Configure Refresh and Full Service intervals yourself.',
  },
];
