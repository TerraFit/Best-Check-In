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

export type RoomCardTone = 'green' | 'yellow' | 'amber' | 'red' | 'blue' | 'grey' | 'purple';

export function getRoomCardTone(room: Pick<
  Room,
  'availability_status' | 'occupancy_status' | 'housekeeping_status' | 'active'
>): RoomCardTone {
  if (!room.active || room.availability_status === 'out_of_order' || room.availability_status === 'maintenance') {
    return 'grey';
  }
  if (room.housekeeping_status === 'do_not_disturb') return 'purple';
  if (room.occupancy_status === 'occupied' || room.occupancy_status === 'departure_pending') return 'blue';
  if (room.housekeeping_status === 'dirty' || room.housekeeping_status === 'full_service_required') return 'red';
  if (room.housekeeping_status === 'refresh_required') return 'yellow';
  if (room.housekeeping_status === 'cleaning_in_progress' || room.housekeeping_status === 'awaiting_inspection') {
    return 'amber';
  }
  if (room.housekeeping_status === 'clean' || room.housekeeping_status === 'inspected') return 'green';
  return 'grey';
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
