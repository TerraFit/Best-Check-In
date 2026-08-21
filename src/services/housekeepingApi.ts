// src/services/housekeepingApi.ts

import type {
  HousekeepingTask,
  HousekeepingSettings,
  HousekeepingDashboardStats,
  HousekeepingTaskStatus,
  InspectionStatus,
} from '../types/housekeeping';
import type {
  HousekeepingServiceSession,
  HousekeepingServiceSettings,
  HousekeepingServiceTarget,
  HousekeepingServiceType,
} from '../types/housekeepingServicePerformance';
import { DEFAULT_HOUSEKEEPING_SETTINGS } from '../types/housekeeping';
import { DEFAULT_HOUSEKEEPING_SERVICE_SETTINGS } from '../types/housekeepingServicePerformance';

async function parseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
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
  const data = await parseJson(await fetch(`/.netlify/functions/get-housekeeping-tasks?${qs}`));
  const raw = data.stats || {};
  const roomsReady = raw.rooms_ready ?? raw.rooms_clean ?? 0;
  const roomsNotReady = raw.rooms_not_ready ?? raw.rooms_dirty ?? 0;
  return {
    tasks: data.tasks || [],
    stats: {
      rooms_ready: roomsReady,
      rooms_not_ready: roomsNotReady,
      rooms_clean: roomsReady,
      rooms_dirty: roomsNotReady,
      refresh_due: raw.refresh_due ?? 0,
      full_service_due: raw.full_service_due ?? 0,
      completed_today: raw.completed_today ?? 0,
      overdue: raw.overdue ?? 0,
    },
    today: data.today,
  };
}

export async function generateHousekeepingTasks(payload: {
  businessId: string;
  bookingId?: string;
  roomId?: string;
  regenerate?: boolean;
}): Promise<Record<string, unknown> & { created: number }> {
  return parseJson(await fetch('/.netlify/functions/generate-housekeeping-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
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
  const data = await parseJson(await fetch('/.netlify/functions/update-housekeeping-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
  return data.task;
}

export async function startHousekeepingService(payload: {
  businessId: string;
  taskId: string;
  serviceType: HousekeepingServiceType;
}): Promise<{ session: HousekeepingServiceSession; timer: { startedAt: string; targetMinutes: number; warningMinutes: number; finalCountdownSeconds: number; voiceEnabled: boolean; soundEnabled: boolean } }> {
  return parseJson(await fetch('/.netlify/functions/start-housekeeping-service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export async function updateHousekeepingServiceProgress(payload: {
  businessId: string;
  sessionId: string;
  checklistState: Record<string, boolean>;
  checklistCompletedCount: number;
  checklistTotalCount: number;
  issuesReportedCount: number;
  notes?: string;
}): Promise<HousekeepingServiceSession> {
  const data = await parseJson(await fetch('/.netlify/functions/update-housekeeping-service-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
  return data.session;
}

export async function completeHousekeepingService(payload: {
  businessId: string;
  sessionId: string;
  checklistCompletedCount: number;
  checklistTotalCount: number;
  issuesReportedCount: number;
  notes?: string;
}): Promise<{ session: HousekeepingServiceSession; performance: { actualSeconds: number; targetSeconds: number; varianceSeconds: number; overTarget: boolean } }> {
  return parseJson(await fetch('/.netlify/functions/complete-housekeeping-service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export async function fetchHousekeepingServiceSettings(businessId: string): Promise<HousekeepingServiceSettings> {
  const data = await parseJson(await fetch(`/.netlify/functions/housekeeping-service-settings?businessId=${encodeURIComponent(businessId)}`));
  return { business_id: businessId, ...DEFAULT_HOUSEKEEPING_SERVICE_SETTINGS, ...(data.settings || {}) };
}

export async function saveHousekeepingServiceSettings(businessId: string, updates: Partial<HousekeepingServiceSettings>): Promise<HousekeepingServiceSettings> {
  const data = await parseJson(await fetch('/.netlify/functions/housekeeping-service-settings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, ...updates }),
  }));
  return { business_id: businessId, ...DEFAULT_HOUSEKEEPING_SERVICE_SETTINGS, ...(data.settings || {}) };
}

export async function fetchHousekeepingServiceTargets(businessId: string): Promise<HousekeepingServiceTarget[]> {
  const data = await parseJson(await fetch(`/.netlify/functions/housekeeping-service-targets?businessId=${encodeURIComponent(businessId)}`));
  return data.targets || [];
}

export async function saveHousekeepingServiceTarget(businessId: string, target: Partial<HousekeepingServiceTarget>): Promise<HousekeepingServiceTarget> {
  const data = await parseJson(await fetch('/.netlify/functions/housekeeping-service-targets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, ...target }),
  }));
  return data.target;
}

export async function fetchHousekeepingSettings(businessId: string): Promise<HousekeepingSettings> {
  const data = await parseJson(await fetch(`/.netlify/functions/housekeeping-settings?businessId=${encodeURIComponent(businessId)}`));
  return { business_id: businessId, ...DEFAULT_HOUSEKEEPING_SETTINGS, ...(data.settings || {}) };
}

export async function saveHousekeepingSettings(businessId: string, updates: Partial<HousekeepingSettings>): Promise<HousekeepingSettings> {
  const data = await parseJson(await fetch('/.netlify/functions/housekeeping-settings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, ...updates }),
  }));
  return { business_id: businessId, ...DEFAULT_HOUSEKEEPING_SETTINGS, ...(data.settings || {}) };
}
