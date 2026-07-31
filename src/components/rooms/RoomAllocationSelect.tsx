// src/components/rooms/RoomAllocationSelect.tsx
// Conflict-prevention dropdown: only available rooms are listed

import { useEffect, useState } from 'react';
import { fetchAvailableRooms, assignRoomToBooking } from '../../services/roomApi';
import { getRoomDisplayName } from '../../services/roomDisplayService';
import type { Room } from '../../types/room';

interface RoomAllocationSelectProps {
  businessId: string;
  bookingId: string;
  checkInDate?: string;
  checkOutDate?: string;
  currentRoomId?: string | null;
  currentRoomLabel?: string | null;
  onAssigned?: (room: Room | null) => void;
}

export default function RoomAllocationSelect({
  businessId,
  bookingId,
  checkInDate,
  checkOutDate,
  currentRoomId,
  currentRoomLabel,
  onAssigned,
}: RoomAllocationSelectProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(currentRoomId || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSelectedId(currentRoomId || '');
  }, [currentRoomId]);

  useEffect(() => {
    if (!businessId || !checkInDate || !checkOutDate) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const available = await fetchAvailableRooms({
          businessId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          excludeBookingId: bookingId,
        });
        if (!cancelled) setRooms(available);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load rooms');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [businessId, checkInDate, checkOutDate, bookingId]);

  const handleAssign = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await assignRoomToBooking({
        bookingId,
        roomId: selectedId || null,
        businessId,
        checkInDate,
        checkOutDate,
      });
      if (result.success) {
        setSuccess(true);
        onAssigned?.(result.room || null);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign room');
    } finally {
      setSaving(false);
    }
  };

  const missingDates = !checkInDate || !checkOutDate;

  return (
    <div className="space-y-3">
      {currentRoomLabel && (
        <p className="text-sm text-gray-600">
          Current:{' '}
          <span className="font-medium text-gray-900">{currentRoomLabel}</span>
        </p>
      )}

      {missingDates && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Set check-in and check-out dates before allocating a room.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loading || missingDates || saving}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
        >
          <option value="">Not allocated</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {getRoomDisplayName(r)}
              {r.room_type ? ` · ${r.room_type}` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAssign}
          disabled={saving || missingDates || selectedId === (currentRoomId || '')}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Assign'}
        </button>
      </div>

      {loading && <p className="text-xs text-gray-400">Loading available rooms…</p>}
      {!loading && !missingDates && rooms.length === 0 && (
        <p className="text-xs text-gray-500">No rooms available for these dates.</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">Room assignment saved.</p>}
    </div>
  );
}
