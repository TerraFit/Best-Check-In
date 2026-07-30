// src/services/housekeepingScheduleEngine.ts
// Intelligent Stay Optimisation — cost-neutral guest experience
//
// 1. Max linen age (policy)
// 2. Minimum Full Services required (never more)
// 3. Even interval distribution; shorter interval nearest checkout
// 4. Mandatory Checkout Full Service

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

/** Maximum consecutive nights on the same linen. */
export function calculateMaximumLinenAge(
  policy: HousekeepingPolicy,
  settings?: HousekeepingSettings
): number {
  if (policy === 'eco') return 5;
  if (policy === 'standard') return 3;
  if (policy === 'custom') return Math.max(1, settings?.custom_full_interval ?? 3);
  if (policy === 'premium') return 1;
  return 3;
}

/**
 * Split stayLength into k equal-as-possible intervals (k = ceil(stay / maxAge)).
 * Larger intervals first; shorter interval(s) at the end (before checkout).
 * Sum of intervals === stayLength; each interval ≤ maxAge.
 */
export function distributeServicesEvenly(
  stayLength: number,
  maxAge: number
): number[] {
  if (stayLength <= 0) return [];
  const k = Math.max(1, Math.ceil(stayLength / maxAge));
  const base = Math.floor(stayLength / k);
  const remainder = stayLength % k;
  const intervals: number[] = [];
  for (let i = 0; i < k; i++) {
    // First `remainder` segments get base+1 (larger), rest get base (shorter at end)
    intervals.push(i < remainder ? base + 1 : base);
  }
  return intervals;
}

/**
 * Mid-stay Full Service night indices from interval model.
 * Cost-neutral: exactly (k - 1) mid-stay FS where k = ceil(stayLength / maxAge).
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

  const maxAge = calculateMaximumLinenAge(policy, settings);
  if (stayLength <= maxAge) return [];

  const intervals = distributeServicesEvenly(stayLength, maxAge);
  // FS at cumulative ends of all intervals except the last (checkout)
  const fs: number[] = [];
  let cum = 0;
  for (let i = 0; i < intervals.length - 1; i++) {
    cum += intervals[i];
    if (cum > 0 && cum < stayLength) fs.push(cum);
  }
  return fs;
}

/** Required mid-stay Full Service count (for diagnostics / cost checks). */
export function calculateRequiredNumberOfFullServices(
  stayLength: number,
  policy: HousekeepingPolicy,
  settings?: HousekeepingSettings
): number {
  return calculateOptimalFullServiceNights(stayLength, policy, settings).length;
}

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
    tasks.push({
      scheduled_date: addDays(checkInDate, stayNight),
      task_type: fullServiceNights.has(stayNight) ? 'full_service' : 'refresh',
      is_checkout: false,
      night_index: stayNight,
    });
  }

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

/** @deprecated — use calculateOptimalFullServiceNights */
export function determineOptimalServiceNights(
  nights: number,
  policy: HousekeepingPolicy,
  settings?: Pick<HousekeepingSettings, 'custom_refresh_interval' | 'custom_full_interval'>
): { nightIndex: number; task_type: HousekeepingTaskType }[] {
  const fs = new Set(
    calculateOptimalFullServiceNights(nights, policy, settings as HousekeepingSettings)
  );
  const out: { nightIndex: number; task_type: HousekeepingTaskType }[] = [];
  for (let n = 1; n < nights; n++) {
    out.push({ nightIndex: n, task_type: fs.has(n) ? 'full_service' : 'refresh' });
  }
  return out;
}
