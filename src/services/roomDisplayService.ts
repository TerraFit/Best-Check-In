// src/services/roomDisplayService.ts
// Presentation helpers for rooms — no API calls

import type { Room, HousekeepingStatus, OccupancyStatus, AvailabilityStatus } from '../types/room';

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
 * Operational colour key for rooms.
 * Green  = Clean / ready
 * Yellow = Refresh required
 * Amber  = Cleaning in progress / inspection
 * Red    = Dirty / full service
 * Blue   = Occupied / departure pending
 * Purple = Do not disturb
 * Grey   = Maintenance / inactive / out of order
 */
export type RoomCardTone = 'green' | 'yellow' | 'amber' | 'red' | 'blue' | 'grey' | 'purple';

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
  if (room.housekeeping_status === 'do_not_disturb') return 'purple';
  if (room.occupancy_status === 'occupied' || room.occupancy_status === 'departure_pending') return 'blue';
  if (room.occupancy_status === 'reserved') return 'blue';
  if (room.housekeeping_status === 'dirty' || room.housekeeping_status === 'full_service_required') return 'red';
  if (room.housekeeping_status === 'refresh_required') return 'yellow';
  if (room.housekeeping_status === 'cleaning_in_progress' || room.housekeeping_status === 'awaiting_inspection') {
    return 'amber';
  }
  if (room.housekeeping_status === 'clean' || room.housekeeping_status === 'inspected') return 'green';
  return 'grey';
}

export const ROOM_TONE_LABELS: Record<RoomCardTone, string> = {
  green: 'Clean / Ready',
  yellow: 'Refresh Required',
  amber: 'Cleaning / Inspection',
  red: 'Dirty / Full Service',
  blue: 'Occupied / Reserved',
  purple: 'Do Not Disturb',
  grey: 'Unavailable / Maintenance',
};

/** Tailwind classes for solid status pills */
export function getRoomToneBadgeClasses(tone: RoomCardTone): string {
  const map: Record<RoomCardTone, string> = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    amber: 'bg-amber-100 text-amber-900 border-amber-200',
    red: 'bg-red-100 text-red-800 border-red-200',
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
    yellow: 'border-l-4 border-l-yellow-400',
    amber: 'border-l-4 border-l-amber-500',
    red: 'border-l-4 border-l-red-500',
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
    yellow: 'bg-yellow-50/60',
    amber: 'bg-amber-50/60',
    red: 'bg-red-50/40',
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
    yellow: 'bg-yellow-400',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    grey: 'bg-gray-400',
  };
  return map[tone];
}

/** Short human-readable status line for lists */
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
  if (room.occupancy_status === 'occupied' || room.occupancy_status === 'departure_pending' || room.occupancy_status === 'reserved') {
    return `${occ} · ${hk}`;
  }
  return hk;
}

export function formatOccupancyLabel(status: OccupancyStatus): string {
  const map: Record<OccupancyStatus, string> = {
    vacant: 'Vacant',
    reserved: 'Reserved',
    occupied: 'Occupied',
    departure_pending: 'Departure Pending',
  };
  return map[status] || status;
}

export function formatHousekeepingLabel(status: HousekeepingStatus): string {
  const map: Record<HousekeepingStatus, string> = {
    clean: 'Clean',
    dirty: 'Dirty',
    refresh_required: 'Refresh Required',
    full_service_required: 'Full Service Required',
    cleaning_in_progress: 'Cleaning In Progress',
    awaiting_inspection: 'Awaiting Inspection',
    inspected: 'Inspected',
    do_not_disturb: 'Do Not Disturb',
  };
  return map[status] || status;
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
