// src/services/roomDisplayService.ts
// Presentation helpers — readiness colours/labels delegate to operational state where possible.

import type { Room, HousekeepingStatus, OccupancyStatus, AvailabilityStatus } from '../types/room';
import { normalizeReadiness } from '../types/room';
import {
  deriveReadinessFromRoom,
  readinessLabel as opReadinessLabel,
  readinessDotTone,
  type ReadinessDotTone,
  type DerivedOccupancy,
} from './roomOperationalStateService';

/** Display name is never stored — always computed. */
export function getRoomDisplayName(
  room: { room_number: number; room_name?: string | null }
): string {
  const name = room.room_name?.trim();
  if (name) return `${room.room_number}. ${name}`;
  return `Room ${room.room_number}`;
}

export function buildRoomCode(businessId: string, roomNumber: number): string {
  const short = businessId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `R-${short}-${String(roomNumber).padStart(3, '0')}`;
}

/** @deprecated prefer ReadinessDotTone from roomOperationalStateService */
export type RoomCardTone = ReadinessDotTone;

export function getRoomCardTone(room: Pick<
  Room,
  'availability_status' | 'occupancy_status' | 'housekeeping_status' | 'active'
>): RoomCardTone {
  return readinessDotTone(deriveReadinessFromRoom(room));
}

export const ROOM_TONE_LABELS: Record<RoomCardTone, string> = {
  green: 'Ready',
  orange: 'Not Ready',
  yellow: 'Cleaning in Progress',
  blue: 'Awaiting Inspection',
  purple: 'Do Not Disturb',
  grey: 'Maintenance',
};

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

function occupancyDisplayLabel(
  room: Pick<Room, 'occupancy_status'> & { derived_occupancy?: string }
): string {
  const derived = (room as { derived_occupancy?: DerivedOccupancy }).derived_occupancy;
  if (derived) {
    const map: Record<string, string> = {
      vacant: 'Vacant',
      reserved: 'Reserved',
      arrival_today: 'Arrival Today',
      occupied: 'Occupied',
      departure_today: 'Departure Today',
    };
    return map[derived] || derived;
  }
  return formatOccupancyLabel(room.occupancy_status as OccupancyStatus);
}

/** Occupancy · Readiness — occupancy prefers live derived value from get-rooms */
export function getRoomStatusSummary(room: Pick<
  Room,
  'active' | 'availability_status' | 'occupancy_status' | 'housekeeping_status' | 'unavailable_reason'
> & { derived_occupancy?: string }): string {
  if (!room.active || room.availability_status === 'unavailable') {
    return room.unavailable_reason || formatAvailabilityLabel(room.availability_status as AvailabilityStatus);
  }
  if (room.availability_status === 'out_of_order' || room.availability_status === 'maintenance') {
    return formatAvailabilityLabel(room.availability_status);
  }
  const occ = occupancyDisplayLabel(room);
  const hk = formatHousekeepingLabel(room.housekeeping_status as HousekeepingStatus);
  return `${occ} · ${hk}`;
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
  return opReadinessLabel(normalizeReadiness(status) === 'do_not_disturb'
    ? 'do_not_disturb'
    : normalizeReadiness(status) === 'cleaning_in_progress'
      ? 'cleaning_in_progress'
      : normalizeReadiness(status) === 'awaiting_inspection'
        ? 'awaiting_inspection'
        : normalizeReadiness(status) === 'not_ready'
          ? 'not_ready'
          : normalizeReadiness(status) === 'ready'
            ? 'ready'
            : 'ready');
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
