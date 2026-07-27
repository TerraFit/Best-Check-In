// src/hooks/useRoomAllocation.ts

import { useState, useEffect, useCallback } from 'react';
import { RoomService } from '../services/roomService';
import { AvailableRoom } from '../types/room';

interface UseRoomAllocationProps {
  businessId: string;
  checkInDate: string;
  checkOutDate: string;
  onRoomSelected?: (roomId: string) => void;
}

export function useRoomAllocation({
  businessId,
  checkInDate,
  checkOutDate,
  onRoomSelected,
}: UseRoomAllocationProps) {
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load available rooms
  const loadAvailableRooms = useCallback(async () => {
    if (!businessId || !checkInDate || !checkOutDate) {
      setAvailableRooms([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rooms = await RoomService.getAvailableRooms(
        businessId,
        checkInDate,
        checkOutDate
      );
      
      console.log(`🏨 Loaded ${rooms.length} available rooms`);
      setAvailableRooms(rooms);
      
      // Reset selected room if it's no longer available
      if (selectedRoom) {
        const stillAvailable = rooms.some(r => r.id === selectedRoom);
        if (!stillAvailable) {
          setSelectedRoom('');
        }
      }
      
    } catch (err) {
      console.error('Failed to load available rooms:', err);
      setError('Failed to load available rooms');
    } finally {
      setLoading(false);
    }
  }, [businessId, checkInDate, checkOutDate, selectedRoom]);

  // Load rooms on mount or when dates change
  useEffect(() => {
    loadAvailableRooms();
  }, [loadAvailableRooms]);

  // Auto-refresh rooms every 60 seconds
  useEffect(() => {
    if (!businessId) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing available rooms...');
      loadAvailableRooms();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [businessId, loadAvailableRooms]);

  // Refresh rooms manually
  const refreshRooms = useCallback(async () => {
    setRefreshing(true);
    await loadAvailableRooms();
    setRefreshing(false);
  }, [loadAvailableRooms]);

  // Select a room
  const selectRoom = useCallback((roomId: string) => {
    const room = availableRooms.find(r => r.id === roomId);
    if (!room) {
      setError('Selected room is not available');
      return false;
    }
    
    setSelectedRoom(roomId);
    onRoomSelected?.(roomId);
    return true;
  }, [availableRooms, onRoomSelected]);

  // Get room details by ID
  const getRoomById = useCallback((roomId: string) => {
    return availableRooms.find(r => r.id === roomId);
  }, [availableRooms]);

  // Check if a room is available
  const isRoomAvailable = useCallback((roomId: string) => {
    const room = availableRooms.find(r => r.id === roomId);
    return room?.isAvailable === true;
  }, [availableRooms]);

  return {
    availableRooms,
    selectedRoom,
    loading,
    refreshing,
    error,
    selectRoom,
    refreshRooms,
    getRoomById,
    isRoomAvailable,
    loadAvailableRooms,
  };
}
