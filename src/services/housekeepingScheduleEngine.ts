// src/services/housekeepingScheduleEngine.ts
// Intelligent Housekeeping Scheduling Engine — pure functions, no I/O
// Checkout Full Service is independent of mid-stay Refresh schedule.

import type {
  HousekeepingPolicy,
  HousekeepingSettings,
  ScheduledService,
  HousekeepingTaskType,
} from '../types/housekeeping';

function parseDate(iso: string): Date {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** Number of nights between check-in and check-out. */
export function calculateStayLength(checkIn: string, checkOut: string): number {
  const a = parseDate(checkIn);
  const b = parseDate(checkOut);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

interface NightService {
  nightIndex: number;
  task_type: HousekeepingTaskType;
}

export function determineOptimalServiceNights(
  nights: number,
  policy: HousekeepingPolicy,
  settings?: Pick<
    HousekeepingSettings,
    'custom_refresh_interval' | 'custom_full_interval'
  >
): NightService[] {
  if (nights <= 2) return [];

  if (policy === 'premium') {
    const out: NightService[] = [];
    for (let n = 1; n < nights; n++) {
      out.push({ nightIndex: n, task_type: 'full_service' });
    }
    return out;
  }

  if (policy === 'custom') {
    return determineCustomNights(nights, settings);
  }

  return determineIntelligentNights(nights, policy);
}

function determineCustomNights(
  nights: number,
  settings?: Pick<HousekeepingSettings, 'custom_refresh_interval' | 'custom_full_interval'>
): NightService[] {
  const refreshEvery = Math.max(1, settings?.custom_refresh_interval ?? 2);
  const fullEvery = Math.max(1, settings?.custom_full_interval ?? 3);
  const out: NightService[] = [];
  const used = new Set<number>();

  for (let n = fullEvery; n < nights; n += fullEvery) {
    out.push({ nightIndex: n, task_type: 'full_service' });
    used.add(n);
  }
  for (let n = refreshEvery; n < nights; n += refreshEvery) {
    if (!used.has(n)) {
      out.push({ nightIndex: n, task_type: 'refresh' });
      used.add(n);
    }
  }
  return out.sort((a, b) => a.nightIndex - b.nightIndex);
}

function determineIntelligentNights(
  nights: number,
  policy: 'eco' | 'standard'
): NightService[] {
  const out: NightService[] = [];
  const maxGap = policy === 'eco' ? 3 : 2;
  let lastServiceNight = 0;
  let lastFullNight = 0;

  for (let night = 1; night < nights; night++) {
    const remainingAfter = nights - night;
    if (remainingAfter <= 0) continue;

    const gap = night - lastServiceNight;
    const forceNearEnd = remainingAfter === 1 && gap >= Math.ceil(maxGap / 2) && nights >= 4;

    if (gap < maxGap && !forceNearEnd) continue;

    let task_type: HousekeepingTaskType = 'refresh';

    if (policy === 'eco') {
      if (night - lastFullNight >= 4 && nights >= 5) {
        task_type = 'full_service';
      }
    } else {
      const isMidpoint =
        Math.abs(night - nights / 2) <= 1 || gap >= maxGap;
      if (isMidpoint && nights >= 4) {
        task_type = 'full_service';
      } else if (night - lastFullNight >= 3) {
        task_type = 'full_service';
      }
    }

    out.push({ nightIndex: night, task_type });
    lastServiceNight = night;
    if (task_type === 'full_service') lastFullNight = night;
  }

  return out;
}

/**
 * Full schedule for a stay.
 * Checkout Full Service does NOT depend on mid-stay services existing.
 */
export function generateSchedule(
  checkIn: string,
  checkOut: string,
  policy: HousekeepingPolicy,
  settings?: HousekeepingSettings
): ScheduledService[] {
  const checkInDate = String(checkIn).slice(0, 10);
  const checkOutDate = String(checkOut).slice(0, 10);
  if (!checkInDate || !checkOutDate) return [];

  const nights = calculateStayLength(checkInDate, checkOutDate);
  const tasks: ScheduledService[] = [];

  if (nights > 0) {
    const mid = determineOptimalServiceNights(nights, policy, settings);
    for (const m of mid) {
      tasks.push({
        scheduled_date: addDays(checkInDate, m.nightIndex),
        task_type: m.task_type,
        is_checkout: false,
        night_index: m.nightIndex,
      });
    }
  }

  const mandatoryCheckout = settings?.mandatory_checkout_fs !== false;
  if (mandatoryCheckout || policy === 'premium') {
    tasks.push({
      scheduled_date: checkOutDate,
      task_type: 'full_service',
      is_checkout: true,
      night_index: nights,
    });
  }

  const byDate = new Map<string, ScheduledService>();
  for (const t of tasks) {
    const existing = byDate.get(t.scheduled_date);
    if (!existing) {
      byDate.set(t.scheduled_date, t);
      continue;
    }
    if (t.is_checkout || (t.task_type === 'full_service' && existing.task_type === 'refresh')) {
      byDate.set(t.scheduled_date, t);
    }
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date)
  );
}

export function taskTypeLabel(type: HousekeepingTaskType, isCheckout?: boolean): string {
  if (isCheckout) return '🧺 Checkout Full Service';
  return type === 'full_service' ? '🧺 Full Service' : '✨ Refresh';
}

export function taskTypeShortLabel(type: HousekeepingTaskType): string {
  return type === 'full_service' ? '🧺 Full Service' : '✨ Refresh';
}
