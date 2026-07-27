// src/services/roomService.ts

import { Room, RoomAllocation, AvailableRoom } from '../types/room';
import { Booking } from '../types';

export class RoomService {
  /**
   * Get all rooms for a business
   */
  static async getRooms(businessId: string): Promise<Room[]> {
    try {
      const response = await fetch(
        `/.netlify/functions/get-rooms?businessId=${businessId}`
      );
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      return data.rooms || [];
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  }

  /**
   * Get all active room allocations for a business
   * This includes checked-in and stayover guests
   */
  static async getActiveAllocations(businessId: string): Promise<RoomAllocation[]> {
    try {
      const response = await fetch(
        `/.netlify/functions/get-active-allocations?businessId=${businessId}`
      );
      if (!response.ok) throw new Error('Failed to fetch allocations');
      const data = await response.json();
      return data.allocations || [];
    } catch (error) {
      console.error('Error fetching allocations:', error);
      return [];
    }
  }

  /**
   * Get available rooms for check-in
   * Excludes rooms that are currently occupied
   */
  static async getAvailableRooms(
    businessId: string,
    checkInDate: string,
    checkOutDate: string
  ): Promise<AvailableRoom[]> {
    try {
      // Get all rooms
      const rooms = await this.getRooms(businessId);
      
      // Get active allocations (checked-in + stayover)
      const activeAllocations = await this.getActiveAllocations(businessId);
      
      // Get all bookings for today (for stayover detection)
      const today = new Date().toISOString().split('T')[0];
      const bookings = await this.getCurrentBookings(businessId, today);
      
      // Map rooms with availability status
      const availableRooms: AvailableRoom[] = rooms.map(room => {
        // Check if room is in active allocation
        const activeAllocation = activeAllocations.find(
          a => a.roomId === room.id && a.status === 'active'
        );
        
        if (activeAllocation) {
          // Room is occupied
          const booking = bookings.find(b => b.id === activeAllocation.bookingId);
          return {
            ...room,
            isAvailable: false,
            currentBookingId: activeAllocation.bookingId,
            currentGuestName: booking?.guestName || 'Unknown Guest',
            checkOutDate: booking?.checkOutDate,
          };
        }
        
        // Room is available
        return {
          ...room,
          isAvailable: true,
        };
      });
      
      // Filter to only available rooms
      return availableRooms.filter(room => room.isAvailable);
      
    } catch (error) {
      console.error('Error getting available rooms:', error);
      return [];
    }
  }

  /**
   * Get current bookings for a business (checked-in and stayover)
   */
  static async getCurrentBookings(businessId: string, date: string): Promise<Booking[]> {
    try {
      const response = await fetch(
        `/.netlify/functions/get-current-bookings?businessId=${businessId}&date=${date}`
      );
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      return data.bookings || [];
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
  }

  /**
   * Allocate a room to a booking
   */
  static async allocateRoom(
    roomId: string,
    bookingId: string,
    checkInDate: string,
    checkOutDate: string
  ): Promise<{ success: boolean; allocationId?: string; error?: string }> {
    try {
      // Check if room is still available
      const allocation = await this.checkRoomAvailability(roomId, checkInDate, checkOutDate);
      
      if (!allocation.isAvailable) {
        return {
          success: false,
          error: allocation.reason || 'Room is no longer available',
        };
      }
      
      // Create allocation
      const response = await fetch('/.netlify/functions/allocate-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          bookingId,
          checkInDate,
          checkOutDate,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to allocate room',
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        allocationId: data.allocationId,
      };
      
    } catch (error) {
      console.error('Error allocating room:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if a room is available for a date range
   */
  static async checkRoomAvailability(
    roomId: string,
    checkInDate: string,
    checkOutDate: string
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    try {
      const response = await fetch(
        `/.netlify/functions/check-room-availability?roomId=${roomId}&checkIn=${checkInDate}&checkOut=${checkOutDate}`
      );
      if (!response.ok) throw new Error('Failed to check availability');
      const data = await response.json();
      return {
        isAvailable: data.available,
        reason: data.reason,
      };
    } catch (error) {
      console.error('Error checking room availability:', error);
      return {
        isAvailable: false,
        reason: 'Error checking availability',
      };
    }
  }
}
