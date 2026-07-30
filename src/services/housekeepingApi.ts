// src/services/housekeepingApi.ts

import type {
  HousekeepingTask,
  HousekeepingSettings,
  HousekeepingDashboardStats,
  HousekeepingTaskStatus,
  InspectionStatus,
} from '../types/housekeeping';

async function parseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}

export async function fetchHousekeepingTasks(params: {
  businessId: string;
  view?: 'today' | 'pending' | 'completed' | 'all';
  date?: string;
  roomId?: string;
  status?: string;
}): Promise<{ tasks: HousekeepingTask[]; stats: HousekeepingDashboardStats; today?: string }> {
  const qs = new URLSearchParams({ businessId: params.businessId });
  if (params.view) qs.set('view', params.view);
  if (params.date) qs.set('date', params.date);
  if (params.roomId) qs.set('roomId', params.roomId);
  if (params.status) qs.set('status', params.status);
  const res = await fetch(`/.netlify/functions/get-housekeeping-tasks?${qs}`);
  const data = await parseJson(res);
  return {
    tasks: data.tasks || [],
    stats: data.stats || {
      rooms_clean: 0,
      rooms_dirty: 0,
      refresh_due: 0,
      full_service_due: 0,
      completed_today: 0,
      overdue: 0,
    },
    today: data.today,
  };
}

export async function generateHousekeepingTasks(payload: {
  businessId: string;
  bookingId?: string;
  roomId?: string;
  regenerate?: boolean;
}): Promise<{
  created: number;
  stayover_refresh?: number;
  stayover_full_service?: number;
  checkout_full_service?: number;
  stayovers_considered?: number;
  checkouts_considered?: number;
  open_tasks_removed?: number;
  rooms_marked_dirty?: number;
  policy?: string;
  message?: string;
  today?: string;
  bookings_processed?: number;
  bookings_matched?: number;
  skipped_no_room?: number;
  skipped_outside_window?: number;
  regenerate?: boolean;
}> {
  const res = await fetch('/.netlify/functions/generate-housekeeping-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateHousekeepingTask(payload: {
  businessId: string;
  taskId: string;
  status?: HousekeepingTaskStatus;
  notes?: string;
  assigned_staff_id?: string | null;
  assigned_staff_name?: string | null;
  inspection_status?: InspectionStatus;
  completed_by?: string;
}): Promise<HousekeepingTask> {
  const res = await fetch('/.netlify/functions/update-housekeeping-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.task;
}

export async function fetchHousekeepingSettings(
  businessId: string
): Promise<HousekeepingSettings> {
  const res = await fetch(
    `/.netlify/functions/housekeeping-settings?businessId=${encodeURIComponent(businessId)}`
  );
  const data = await parseJson(res);
  return data.settings;
}

export async function saveHousekeepingSettings(
  businessId: string,
  updates: Partial<HousekeepingSettings>
): Promise<HousekeepingSettings> {
  const res = await fetch('/.netlify/functions/housekeeping-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, ...updates }),
  });
  const data = await parseJson(res);
  return data.settings;
}
