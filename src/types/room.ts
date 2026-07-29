// src/types/room.ts
// Room Operations — Phase 1 types

export type AvailabilityStatus =
  | 'available'
  | 'unavailable'
  | 'out_of_order'
  | 'maintenance';

export type OccupancyStatus =
  | 'vacant'
  | 'reserved'
  | 'occupied'
  | 'departure_pending';

export type HousekeepingStatus =
  | 'clean'
  | 'dirty'
  | 'refresh_required'
  | 'full_service_required'
  | 'cleaning_in_progress'
  | 'awaiting_inspection'
  | 'inspected'
  | 'do_not_disturb';

export type RoomCondition =
  | 'good'
  | 'minor_damage'
  | 'major_damage'
  | 'needs_maintenance';

export type CleaningPriority =
  | 'vip'
  | 'early_arrival'
  | 'standard'
  | 'late_checkout'
  | 'maintenance';

export type RoomEventSource = 'system' | 'staff' | 'guest' | 'integration';

export type RoomEventSeverity = 'info' | 'warning' | 'critical';

export type RoomType =
  | 'Standard'
  | 'Deluxe'
  | 'Luxury'
  | 'Family'
  | 'Suite'
  | 'Tent'
  | 'Chalet'
  | 'Cottage'
  | 'Dormitory'
  | 'Camping Site'
  | string;

export interface Room {
  id: string;
  business_id: string;
  room_number: number;
  room_name?: string | null;
  room_code: string;
  room_type: RoomType;
  max_adults: number;
  max_children: number;
  max_infants: number;
  availability_status: AvailabilityStatus;
  occupancy_status: OccupancyStatus;
  housekeeping_status: HousekeepingStatus;
  room_condition: RoomCondition;
  cleaning_priority: CleaningPriority;
  active: boolean;
  sort_order?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RoomEvent {
  id: string;
  business_id: string;
  room_id: string;
  event_type: string;
  source: RoomEventSource;
  severity: RoomEventSeverity;
  booking_id?: string | null;
  guest_name?: string | null;
  performed_by?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface RoomUpdatePayload {
  room_name?: string | null;
  room_type?: RoomType;
  max_adults?: number;
  max_children?: number;
  max_infants?: number;
  availability_status?: AvailabilityStatus;
  occupancy_status?: OccupancyStatus;
  housekeeping_status?: HousekeepingStatus;
  room_condition?: RoomCondition;
  cleaning_priority?: CleaningPriority;
  active?: boolean;
  sort_order?: number | null;
  notes?: string | null;
}

export interface AssignRoomPayload {
  bookingId: string;
  roomId: string | null;
  businessId: string;
  checkInDate?: string;
  checkOutDate?: string;
}

export interface SyncRoomsResult {
  created: number;
  existing: number;
  deactivated: number;
  requiresConfirmation?: boolean;
  excessRooms?: Room[];
  rooms: Room[];
}
