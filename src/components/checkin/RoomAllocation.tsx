// src/components/checkin/RoomAllocation.tsx

import React, { useEffect, useState } from 'react';
import { useRoomAllocation } from '../../hooks/useRoomAllocation';
import { AvailableRoom } from '../../types/room';

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
  required = true,
  touched = false,
  error,
  label = 'Room Allocation',
  primaryColor = '#f59e0b',
}: RoomAllocationProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const {
    availableRooms,
    selectedRoom,
    loading,
    refreshing,
    error: roomError,
    selectRoom,
    refreshRooms,
  } = useRoomAllocation({
    businessId,
    checkInDate,
    checkOutDate,
    onRoomSelected: onChange,
  });

  // Sync selected room with external value
  useEffect(() => {
    if (value && value !== selectedRoom) {
      const room = availableRooms.find(r => r.id === value);
      if (room?.isAvailable) {
        selectRoom(value);
      } else {
        onChange('');
      }
    }
  }, [value, availableRooms, selectedRoom, selectRoom, onChange]);

  // Report errors to parent
  useEffect(() => {
    if (roomError) {
      onError?.(roomError);
    }
  }, [roomError, onError]);

  const getRoomLabel = (room: AvailableRoom) => {
    let label = `Room ${room.number}`;
    if (room.name) label += ` - ${room.name}`;
    if (room.type) label += ` (${room.type})`;
    
    // Show occupancy info if available
    if (!room.isAvailable && room.currentGuestName) {
      label += ` 🔒 ${room.currentGuestName}`;
    }
    
    return label;
  };

  const hasAvailableRooms = availableRooms.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-stone-700">
          {label} {required && '*'}
        </label>
        
        {/* Refresh button */}
        <button
          type="button"
          onClick={refreshRooms}
          disabled={refreshing || loading}
          className={`text-xs text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1 ${
            (refreshing || loading) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <svg 
            className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Room count info */}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span>
          {loading ? 'Loading rooms...' : `${availableRooms.length} room${availableRooms.length !== 1 ? 's' : ''} available`}
        </span>
        {availableRooms.length > 0 && (
          <button
            type="button"
            className="text-amber-600 hover:text-amber-800"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Tooltip for occupied rooms info */}
      {showTooltip && availableRooms.length > 0 && (
        <div className="text-xs bg-stone-100 p-3 rounded-lg border border-stone-200">
          <p className="font-medium text-stone-700 mb-1">Room Status:</p>
          <ul className="space-y-0.5 text-stone-600">
            <li>🟢 Available - Ready for check-in</li>
            <li>🔒 Occupied - Currently checked in or stayover</li>
          </ul>
          <p className="mt-1 text-stone-400">
            Rooms with current guests are automatically hidden
          </p>
        </div>
      )}

      {/* Room dropdown */}
      <select
        value={value || ''}
        onChange={(e) => {
          const roomId = e.target.value;
          if (roomId) {
            selectRoom(roomId);
          } else {
            onChange('');
          }
        }}
        disabled={loading || !hasAvailableRooms}
        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
          loading || !hasAvailableRooms
            ? 'bg-stone-50 border-stone-200 cursor-not-allowed'
            : error && touched
            ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
            : 'border-stone-200 focus:ring-amber-500 focus:border-amber-500'
        }`}
      >
        <option value="">
          {loading 
            ? 'Loading rooms...' 
            : hasAvailableRooms 
              ? `Select ${label}` 
              : 'No rooms available'}
        </option>
        
        {availableRooms.map((room) => (
          <option key={room.id} value={room.id}>
            {getRoomLabel(room)}
          </option>
        ))}
      </select>

      {/* Error message */}
      {error && touched && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}

      {/* No rooms message */}
      {!loading && !hasAvailableRooms && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">No rooms available</span>
          </div>
          <p className="text-sm text-amber-600 mt-1">
            All rooms are currently occupied. Please check back later or contact management.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-stone-400 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent" />
          <span>Loading room availability...</span>
        </div>
      )}
    </div>
  );
}
