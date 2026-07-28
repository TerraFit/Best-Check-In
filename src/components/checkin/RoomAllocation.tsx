// src/components/checkin/RoomAllocation.tsx
// ✅ FIXED: Date-aware room availability

import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
  room_name: string;
  room_type: string;
  status: string;
  is_available?: boolean;
  current_guest?: string;
  check_out_date?: string;
}

interface RoomAllocationProps {
  businessId: string;
  checkInDate: string;
  checkOutDate: string;
  value: string;
  onChange: (roomId: string) => void;
  onError?: (error: string) => void;
  required?: boolean;
  touched?: boolean;
  error?: string;
  label?: string;
  primaryColor?: string;
}

export function RoomAllocation({
  businessId,
  checkInDate,
  checkOutDate,
  value,
  onChange,
  onError,
  required = false,
  touched = false,
  error,
  label = 'Room Allocation',
  primaryColor = '#f59e0b',
}: RoomAllocationProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(value || '');

  // ✅ Load available rooms with date checking
  const loadRooms = async () => {
    if (!businessId) return;

    setLoading(true);
    setLoadError(null);

    try {
      // ✅ Pass check-in and check-out dates to API
      const url = `/.netlify/functions/get-available-rooms?businessId=${businessId}&checkIn=${checkInDate}&checkOut=${checkOutDate}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load rooms: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // ✅ API already filters by date - just set the rooms
        setRooms(data.rooms || []);
      } else {
        throw new Error(data.error || 'Failed to load rooms');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load rooms';
      setLoadError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Load rooms when dates change
  useEffect(() => {
    if (businessId && checkInDate) {
      loadRooms();
    }
  }, [businessId, checkInDate, checkOutDate]);

  // Sync selected room with external value
  useEffect(() => {
    setSelectedRoomId(value || '');
  }, [value]);

  // Handle room selection
  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    onChange(roomId);
  };

  // ✅ Only show rooms that are available for the selected dates
  const availableRooms = rooms.filter(room => {
    // Skip rooms that are not available
    if (room.is_available === false) return false;
    // Only show rooms with 'active' status
    return room.status === 'active';
  });

  const hasAvailableRooms = availableRooms.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-stone-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {!required && <span className="text-xs text-stone-400 font-normal ml-1">(optional)</span>}
        </label>
        <button
          type="button"
          onClick={loadRooms}
          disabled={loading}
          className="text-xs text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Room select dropdown */}
      <select
        value={selectedRoomId}
        onChange={(e) => handleRoomChange(e.target.value)}
        disabled={loading || !hasAvailableRooms}
        className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
          loadError
            ? 'border-red-300 bg-red-50'
            : loading || !hasAvailableRooms
            ? 'bg-stone-50 border-stone-200 cursor-not-allowed'
            : 'border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent'
        }`}
      >
        <option value="">
          {loadError ? 'Error loading rooms' :
           loading ? 'Loading rooms...' :
           !hasAvailableRooms ? 'No rooms available for these dates' :
           'Select a room...'}
        </option>
        {!loadError && !loading && availableRooms.map((room) => (
          <option key={room.id} value={room.id}>
            #{room.room_number} - {room.room_name} ({room.room_type})
            {room.current_guest && ` 🔒 ${room.current_guest} until ${room.check_out_date}`}
          </option>
        ))}
      </select>

      {/* Help text */}
      <p className="text-xs text-stone-400">
        {loading ? 'Loading available rooms...' :
         loadError ? 'Unable to load rooms. Please try again.' :
         hasAvailableRooms ? `${availableRooms.length} room${availableRooms.length !== 1 ? 's' : ''} available for your stay` :
         'No rooms available for the selected dates'}
      </p>

      {/* Error message */}
      {loadError && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{loadError}</span>
          <button
            type="button"
            onClick={loadRooms}
            className="text-red-600 hover:text-red-800 font-medium ml-auto"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
