// src/services/housekeepingScheduleEngine.ts
// Intelligent Stay Optimisation Algorithm (approved Phase 2)
// Stage 1: calculateOptimalFullServiceNights(stayLength, policy)
// Stage 2: assign Full Service / Refresh from that set + mandatory Checkout FS

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

export function calculateStayLength(checkIn: string, checkOut: string): number {
  const a = parseDate(checkIn);
  const b = parseDate(checkOut);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function maxLinenAge(policy: HousekeepingPolicy, settings?: HousekeepingSettings): number {
  if (policy === 'eco') return 5;
  if (policy === 'standard') return 3;
  if (policy === 'custom') {
    return Math.max(1, settings?.custom_full_interval ?? 3);
  }
  // premium: every night FS — age unused
  return 1;
}

/**
 * Stage 1 — optimal Full Service night indices (1 .. stayLength-1).
 * Checkout night is never included (handled separately as Checkout FS).
 * Never places FS on stayLength-1 when avoidable (linen change day before departure).
 */
export function calculateOptimalFullServiceNights(
  stayLength: number,
  policy: HousekeepingPolicy,
  settings?: HousekeepingSettings
): number[] {
  if (stayLength <= 1) return [];

  if (policy === 'premium') {
    const out: number[] = [];
    for (let n = 1; n < stayLength; n++) out.push(n);
    return out;
  }

  const maxAge = maxLinenAge(policy, settings);
  if (stayLength <= maxAge) return [];

  const segments = Math.ceil(stayLength / maxAge);
  const needed = segments - 1;
  if (needed <= 0) return [];

  const fs: number[] = [];

  if (needed === 1) {
    // Single FS: keep start/end gaps ≤ maxAge, prefer centre
    let pos = Math.round(stayLength / 2);
    pos = Math.min(maxAge, Math.max(stayLength - maxAge, pos));
    if (pos === stayLength - 1) pos = stayLength - 2;
    if (pos >= 1 && pos < stayLength) return [pos];
    return [];
  }

  for (let i = 1; i <= needed; i++) {
    let pos = Math.round((i * stayLength) / (needed + 1));
    const alternate = i * maxAge;
    if (Math.abs(alternate - pos) <= 1 && alternate > 0 && alternate < stayLength) {
      pos = alternate;
    }
    if (pos === stayLength - 1) pos = pos - 1;

    const prev = fs.length ? fs[fs.length - 1] : 0;
    if (pos - prev > maxAge) pos = prev + maxAge;
    if (pos === stayLength - 1) pos = pos - 1;
    if (pos > prev && pos < stayLength) fs.push(pos);
  }

  let last = fs.length ? fs[fs.length - 1] : 0;
  while (stayLength - last > maxAge) {
    let pos = last + maxAge;
    if (pos >= stayLength - 1) pos = stayLength - 2;
    if (pos <= last) break;
    fs.push(pos);
    last = pos;
  }

  return fs;
}

/**
 * Stage 2 — build full schedule from optimal FS nights.
 * Every mid-stay night 1..stayLength-1 is either Full Service or Refresh.
 * Checkout is always Full Service (is_checkout).
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

  const stayLength = calculateStayLength(checkInDate, checkOutDate);
  if (stayLength <= 0) {
    // Same-day edge: checkout FS only
    return [
      {
        scheduled_date: checkOutDate,
        task_type: 'full_service',
        is_checkout: true,
        night_index: 1,
      },
    ];
  }

  const fullServiceNights = new Set(
    calculateOptimalFullServiceNights(stayLength, policy, settings)
  );

  const tasks: ScheduledService[] = [];

  for (let stayNight = 1; stayNight < stayLength; stayNight++) {
    const isFs = fullServiceNights.has(stayNight);
    tasks.push({
      scheduled_date: addDays(checkInDate, stayNight),
      task_type: isFs ? 'full_service' : 'refresh',
      is_checkout: false,
      night_index: stayNight,
    });
  }

  // Permanent rule: checkout is always Full Service (Checkout)
  tasks.push({
    scheduled_date: checkOutDate,
    task_type: 'full_service',
    is_checkout: true,
    night_index: stayLength,
  });

  return tasks;
}

export function taskTypeLabel(type: HousekeepingTaskType, isCheckout?: boolean): string {
  if (isCheckout) return '🧺 Full Service (Checkout)';
  return type === 'full_service' ? '🧺 Full Service' : '✨ Refresh';
}

export function taskTypeShortLabel(type: HousekeepingTaskType): string {
  return type === 'full_service' ? '🧺 Full Service' : '✨ Refresh';
}

/** @deprecated kept for any external imports — use calculateOptimalFullServiceNights */
export function determineOptimalServiceNights(
  nights: number,
  policy: HousekeepingPolicy,
  settings?: Pick<HousekeepingSettings, 'custom_refresh_interval' | 'custom_full_interval'>
): { nightIndex: number; task_type: HousekeepingTaskType }[] {
  const fs = calculateOptimalFullServiceNights(nights, policy, settings as HousekeepingSettings);
  const set = new Set(fs);
  const out: { nightIndex: number; task_type: HousekeepingTaskType }[] = [];
  for (let n = 1; n < nights; n++) {
    out.push({ nightIndex: n, task_type: set.has(n) ? 'full_service' : 'refresh' });
  }
  return out;
}
