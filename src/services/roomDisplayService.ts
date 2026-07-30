// src/services/roomDisplayService.ts
// Presentation helpers for rooms — no API calls
// Readiness legend: Ready / Not Ready / Cleaning / Inspection / Maintenance / DND

import type { Room, HousekeepingStatus, OccupancyStatus, AvailabilityStatus } from '../types/room';
import { normalizeReadiness } from '../types/room';

/** Display name is never stored — always computed. */
export function getRoomDisplayName(
  room: { room_number: number; room_name?: string | null }
): string {
  const name = room.room_name?.trim();
  if (name) return `${room.room_number}. ${name}`;
  return `Room ${room.room_number}`;
}

/** Stable internal code for integrations (immutable after create). */
export function buildRoomCode(businessId: string, roomNumber: number): string {
  const short = businessId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `R-${short}-${String(roomNumber).padStart(3, '0')}`;
}

/**
 * Operational colour key for rooms (readiness-first).
 * Green  = Ready
 * Orange = Not Ready
 * Yellow = Cleaning in Progress
 * Blue   = Awaiting Inspection
 * Purple = Do Not Disturb
 * Grey   = Maintenance / inactive / out of order
 */
export type RoomCardTone = 'green' | 'orange' | 'yellow' | 'blue' | 'purple' | 'grey';

export function getRoomCardTone(room: Pick<
  Room,
  'availability_status' | 'occupancy_status' | 'housekeeping_status' | 'active'
>): RoomCardTone {
  if (!room.active || room.availability_status === 'out_of_order' || room.availability_status === 'maintenance') {
    return 'grey';
  }
  if (room.availability_status === 'unavailable') {
    return 'grey';
  }

  const readiness = normalizeReadiness(room.housekeeping_status);

  if (readiness === 'do_not_disturb') return 'purple';
  if (readiness === 'cleaning_in_progress') return 'yellow';
  if (readiness === 'awaiting_inspection') return 'blue';
  if (readiness === 'not_ready') return 'orange';
  if (readiness === 'ready') return 'green';

  return 'grey';
}

export const ROOM_TONE_LABELS: Record<RoomCardTone, string> = {
  green: 'Ready',
  orange: 'Not Ready',
  yellow: 'Cleaning in Progress',
  blue: 'Awaiting Inspection',
  purple: 'Do Not Disturb',
  grey: 'Maintenance',
};

/** Tailwind classes for solid status pills */
export function getRoomToneBadgeClasses(tone: RoomCardTone): string {
  const map: Record<RoomCardTone, string> = {
    green: 'bg-green-100 text-green-800 border-green-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    grey: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return map[tone];
}

/** Left border accent for rows / cards */
export function getRoomToneBorderClass(tone: RoomCardTone): string {
  const map: Record<RoomCardTone, string> = {
    green: 'border-l-4 border-l-green-500',
    orange: 'border-l-4 border-l-orange-500',
    yellow: 'border-l-4 border-l-yellow-400',
    blue: 'border-l-4 border-l-blue-500',
    purple: 'border-l-4 border-l-purple-500',
    grey: 'border-l-4 border-l-gray-400',
  };
  return map[tone];
}

/** Soft background for card surfaces */
export function getRoomToneSurfaceClass(tone: RoomCardTone): string {
  const map: Record<RoomCardTone, string> = {
    green: 'bg-green-50/60',
    orange: 'bg-orange-50/60',
    yellow: 'bg-yellow-50/60',
    blue: 'bg-blue-50/60',
    purple: 'bg-purple-50/60',
    grey: 'bg-gray-50',
  };
  return map[tone];
}

/** Dot indicator colour */
export function getRoomToneDotClass(tone: RoomCardTone): string {
  const map: Record<RoomCardTone, string> = {
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-400',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    grey: 'bg-gray-400',
  };
  return map[tone];
}

/** Short human-readable status line: Occupancy · Readiness */
export function getRoomStatusSummary(room: Pick<
  Room,
  'active' | 'availability_status' | 'occupancy_status' | 'housekeeping_status' | 'unavailable_reason'
>): string {
  if (!room.active || room.availability_status === 'unavailable') {
    return room.unavailable_reason || formatAvailabilityLabel(room.availability_status as AvailabilityStatus);
  }
  if (room.availability_status === 'out_of_order' || room.availability_status === 'maintenance') {
    return formatAvailabilityLabel(room.availability_status);
  }
  const occ = formatOccupancyLabel(room.occupancy_status as OccupancyStatus);
  const hk = formatHousekeepingLabel(room.housekeeping_status as HousekeepingStatus);
  if (
    room.occupancy_status === 'occupied' ||
    room.occupancy_status === 'departure_pending' ||
    room.occupancy_status === 'reserved'
  ) {
    return `${occ} · ${hk}`;
  }
  return hk;
}

export function formatOccupancyLabel(status: OccupancyStatus): string {
  const map: Record<OccupancyStatus, string> = {
    vacant: 'Vacant',
    reserved: 'Reserved',
    occupied: 'Occupied',
    departure_pending: 'Departure Today',
  };
  return map[status] || status;
}

export function formatHousekeepingLabel(status: HousekeepingStatus): string {
  const readiness = normalizeReadiness(status);
  const map: Record<string, string> = {
    ready: 'Ready',
    not_ready: 'Not Ready',
    cleaning_in_progress: 'Cleaning in Progress',
    awaiting_inspection: 'Awaiting Inspection',
    do_not_disturb: 'Do Not Disturb',
  };
  return map[readiness] || status;
}

export function formatAvailabilityLabel(status: AvailabilityStatus): string {
  const map: Record<AvailabilityStatus, string> = {
    available: 'Available',
    unavailable: 'Unavailable',
    out_of_order: 'Out of Order',
    maintenance: 'Maintenance',
  };
  return map[status] || status;
}
