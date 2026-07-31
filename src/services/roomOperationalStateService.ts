// src/services/roomOperationalStateService.ts
// Single source of truth for room operational display.
// Occupancy  → derived ONLY from bookings (never from stale rooms.occupancy_status)
// Readiness  → derived ONLY from housekeeping workflow / availability flags
// UI combines both; neither overwrites the other.

import type { Room, AvailabilityStatus, HousekeepingStatus } from '../types/room';
import { normalizeReadiness } from '../types/room';

export type DerivedOccupancy =
  | 'vacant'
  | 'reserved'
  | 'arrival_today'
  | 'occupied'
  | 'departure_today';

export type DerivedReadiness =
  | 'ready'
  | 'not_ready'
  | 'cleaning_in_progress'
  | 'awaiting_inspection'
  | 'maintenance'
  | 'do_not_disturb';

export type ReadinessDotTone = 'green' | 'orange' | 'yellow' | 'blue' | 'grey' | 'purple';

export interface BookingForOccupancy {
  id?: string;
  room_id?: string | null;
  room_number?: number | string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  status?: string | null;
}

export interface RoomOperationalState {
  occupancyStatus: DerivedOccupancy;
  readinessStatus: DerivedReadiness;
  displayStatus: string;
  statusColour: ReadinessDotTone;
  statusIcon: string;
  occupancyLabel: string;
  readinessLabel: string;
}

export function todayInJohannesburg(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function sliceDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return String(iso).slice(0, 10);
}

function isCancelled(status: string | null | undefined): boolean {
  const s = (status || '').toLowerCase();
  return ['cancelled', 'canceled', 'no_show'].includes(s);
}

function roomMatchesBooking(
  room: Pick<Room, 'id' | 'room_number'>,
  booking: BookingForOccupancy
): boolean {
  if (booking.room_id && booking.room_id === room.id) return true;
  if (
    booking.room_number !== null &&
    booking.room_number !== undefined &&
    booking.room_number !== '' &&
    Number(booking.room_number) === Number(room.room_number)
  ) {
    return true;
  }
  return false;
}

/**
 * Occupancy priority (highest first):
 * Occupied → Departure Today → Arrival Today → Reserved → Vacant
 */
export function deriveOccupancyFromBookings(
  room: Pick<Room, 'id' | 'room_number'>,
  bookings: BookingForOccupancy[],
  todayStr: string = todayInJohannesburg()
): DerivedOccupancy {
  let hasOccupied = false;
  let hasDeparture = false;
  let hasArrival = false;
  let hasReserved = false;

  for (const b of bookings) {
    if (isCancelled(b.status)) continue;
    if (!roomMatchesBooking(room, b)) continue;

    const checkIn = sliceDate(b.check_in_date);
    const checkOut = sliceDate(b.check_out_date);
    if (!checkIn || !checkOut) continue;

    // Past stays — ignore
    if (checkOut < todayStr) continue;

    if (checkIn < todayStr && todayStr < checkOut) {
      hasOccupied = true;
    } else if (todayStr === checkOut) {
      hasDeparture = true;
    } else if (todayStr === checkIn) {
      hasArrival = true;
    } else if (checkIn > todayStr) {
      hasReserved = true;
    }
  }

  if (hasOccupied) return 'occupied';
  if (hasDeparture) return 'departure_today';
  if (hasArrival) return 'arrival_today';
  if (hasReserved) return 'reserved';
  return 'vacant';
}

/**
 * Readiness from room flags only (not bookings).
 * Maintenance / out of order / inactive → maintenance
 * DND → do_not_disturb
 * else normalize housekeeping_status
 */
export function deriveReadinessFromRoom(
  room: Pick<Room, 'active' | 'availability_status' | 'housekeeping_status'>
): DerivedReadiness {
  if (
    !room.active ||
    room.availability_status === 'out_of_order' ||
    room.availability_status === 'maintenance' ||
    room.availability_status === 'unavailable'
  ) {
    return 'maintenance';
  }

  const hk = normalizeReadiness(room.housekeeping_status as HousekeepingStatus);
  if (hk === 'do_not_disturb') return 'do_not_disturb';
  if (hk === 'cleaning_in_progress') return 'cleaning_in_progress';
  if (hk === 'awaiting_inspection') return 'awaiting_inspection';
  if (hk === 'not_ready') return 'not_ready';
  return 'ready';
}

export function occupancyLabel(status: DerivedOccupancy): string {
  const map: Record<DerivedOccupancy, string> = {
    vacant: 'Vacant',
    reserved: 'Reserved',
    arrival_today: 'Arrival Today',
    occupied: 'Occupied',
    departure_today: 'Departure Today',
  };
  return map[status];
}

export function readinessLabel(status: DerivedReadiness): string {
  const map: Record<DerivedReadiness, string> = {
    ready: 'Ready',
    not_ready: 'Not Ready',
    cleaning_in_progress: 'Cleaning in Progress',
    awaiting_inspection: 'Awaiting Inspection',
    maintenance: 'Maintenance',
    do_not_disturb: 'Do Not Disturb',
  };
  return map[status];
}

export function readinessDotTone(status: DerivedReadiness): ReadinessDotTone {
  const map: Record<DerivedReadiness, ReadinessDotTone> = {
    ready: 'green',
    not_ready: 'orange',
    cleaning_in_progress: 'yellow',
    awaiting_inspection: 'blue',
    maintenance: 'grey',
    do_not_disturb: 'purple',
  };
  return map[status];
}

export function readinessDotClass(tone: ReadinessDotTone): string {
  const map: Record<ReadinessDotTone, string> = {
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-400',
    blue: 'bg-blue-500',
    grey: 'bg-gray-400',
    purple: 'bg-purple-500',
  };
  return map[tone];
}

export function readinessIcon(status: DerivedReadiness): string {
  if (status === 'maintenance') return '🔧';
  if (status === 'do_not_disturb') return '🚫';
  return '●';
}

/**
 * Canonical combined state for one room.
 */
export function getRoomOperationalState(
  room: Pick<Room, 'id' | 'room_number' | 'active' | 'availability_status' | 'housekeeping_status'>,
  bookings: BookingForOccupancy[],
  todayStr: string = todayInJohannesburg()
): RoomOperationalState {
  const occupancyStatus = deriveOccupancyFromBookings(room, bookings, todayStr);
  const readinessStatus = deriveReadinessFromRoom(room);
  const occ = occupancyLabel(occupancyStatus);
  const ready = readinessLabel(readinessStatus);

  return {
    occupancyStatus,
    readinessStatus,
    displayStatus: `${occ} · ${ready}`,
    statusColour: readinessDotTone(readinessStatus),
    statusIcon: readinessIcon(readinessStatus),
    occupancyLabel: occ,
    readinessLabel: ready,
  };
}

/** Map room_id → operational state for batch UI */
export function buildRoomStateMap(
  rooms: Array<
    Pick<Room, 'id' | 'room_number' | 'active' | 'availability_status' | 'housekeeping_status'>
  >,
  bookings: BookingForOccupancy[],
  todayStr: string = todayInJohannesburg()
): Map<string, RoomOperationalState> {
  const map = new Map<string, RoomOperationalState>();
  for (const room of rooms) {
    map.set(room.id, getRoomOperationalState(room, bookings, todayStr));
  }
  return map;
}

/** Lookup readiness for a guest card by room_id or room_number */
export function findRoomReadiness(
  rooms: Array<
    Pick<Room, 'id' | 'room_number' | 'active' | 'availability_status' | 'housekeeping_status'>
  >,
  guest: { room_id?: string | null; room_number?: number | string | null },
  bookings: BookingForOccupancy[] = [],
  todayStr: string = todayInJohannesburg()
): RoomOperationalState | null {
  const room =
    rooms.find((r) => guest.room_id && r.id === guest.room_id) ||
    rooms.find(
      (r) =>
        guest.room_number !== null &&
        guest.room_number !== undefined &&
        guest.room_number !== '' &&
        Number(r.room_number) === Number(guest.room_number)
    );
  if (!room) return null;
  return getRoomOperationalState(room, bookings, todayStr);
}

/** Aggregate readiness counters from rooms (not tasks) */
export function countReadiness(
  rooms: Array<Pick<Room, 'active' | 'availability_status' | 'housekeeping_status'>>
): Record<DerivedReadiness, number> {
  const counts: Record<DerivedReadiness, number> = {
    ready: 0,
    not_ready: 0,
    cleaning_in_progress: 0,
    awaiting_inspection: 0,
    maintenance: 0,
    do_not_disturb: 0,
  };
  for (const room of rooms) {
    if (!room.active && room.availability_status !== 'unavailable') {
      // inactive still counts as maintenance for stats of active inventory only
    }
    const r = deriveReadinessFromRoom(room);
    counts[r] += 1;
  }
  return counts;
}

/** DB occupancy_status value closest to derived (for optional persistence) */
export function toStoredOccupancyStatus(
  derived: DerivedOccupancy
): 'vacant' | 'reserved' | 'occupied' | 'departure_pending' {
  switch (derived) {
    case 'vacant':
      return 'vacant';
    case 'reserved':
    case 'arrival_today':
      return 'reserved';
    case 'occupied':
      return 'occupied';
    case 'departure_today':
      return 'departure_pending';
  }
}
