// src/types/room.ts

export interface Room {
  id: string;
  number: string;
  name?: string;
  type: string;
  capacity: number;
  businessId: string;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
}

export interface RoomAllocation {
  id: string;
  roomId: string;
  bookingId: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface AvailableRoom extends Room {
  isAvailable: boolean;
  currentBookingId?: string;
  currentGuestName?: string;
  checkOutDate?: string;
}
