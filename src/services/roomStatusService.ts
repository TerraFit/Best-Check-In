// src/services/roomStatusService.ts
// Status transition rules (application layer — not DB triggers)

import type {
  AvailabilityStatus,
  OccupancyStatus,
  HousekeepingStatus,
  Room,
} from '../types/room';

export interface StatusTransition {
  availability_status?: AvailabilityStatus;
  occupancy_status?: OccupancyStatus;
  housekeeping_status?: HousekeepingStatus;
}

/** When a room is allocated to a future booking */
export function onRoomReserved(): StatusTransition {
  return { occupancy_status: 'reserved' };
}

/** When guest checks in */
export function onGuestCheckIn(): StatusTransition {
  return { occupancy_status: 'occupied' };
}

/** When guest checks out — room stays operational until housekeeping */
export function onGuestCheckOut(): StatusTransition {
  return {
    occupancy_status: 'departure_pending',
    housekeeping_status: 'dirty',
  };
}

/** After departure_pending is acknowledged and HK starts */
export function onMarkDirty(): StatusTransition {
  return {
    occupancy_status: 'vacant',
    housekeeping_status: 'dirty',
  };
}

export function onCleaningStarted(): StatusTransition {
  return { housekeeping_status: 'cleaning_in_progress' };
}

export function onAwaitingInspection(): StatusTransition {
  return { housekeeping_status: 'awaiting_inspection' };
}

export function onInspectionApproved(): StatusTransition {
  return {
    housekeeping_status: 'clean',
    occupancy_status: 'vacant',
  };
}

export function onOutOfOrder(): StatusTransition {
  return {
    availability_status: 'out_of_order',
    occupancy_status: 'vacant',
  };
}

export function onReturnToService(): StatusTransition {
  return {
    availability_status: 'available',
    housekeeping_status: 'dirty',
  };
}

/** Apply partial status patch onto a room object (pure). */
export function applyStatusTransition(
  room: Room,
  transition: StatusTransition
): Room {
  return {
    ...room,
    ...transition,
    updated_at: new Date().toISOString(),
  };
}

/** Whether a room can be offered for sale / allocation */
export function isAllocatable(room: Pick<Room, 'active' | 'availability_status'>): boolean {
  return (
    room.active === true &&
    room.availability_status === 'available'
  );
}
