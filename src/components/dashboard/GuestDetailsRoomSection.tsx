// src/components/dashboard/GuestDetailsRoomSection.tsx
// Room allocation block for GuestDetailsModal (Phase 1)

import { Bed } from 'lucide-react';
import RoomAllocationSelect from '../rooms/RoomAllocationSelect';
import { getRoomDisplayName } from '../../services/roomDisplayService';
import type { Room } from '../../types/room';

interface Props {
  businessId: string;
  bookingId: string;
  checkInDate?: string;
  checkOutDate?: string;
  roomId?: string | null;
  roomNumber?: number | null;
  roomName?: string | null;
  onAssigned?: (room: Room | null) => void;
}

export default function GuestDetailsRoomSection({
  businessId,
  bookingId,
  checkInDate,
  checkOutDate,
  roomId,
  roomNumber,
  roomName,
  onAssigned,
}: Props) {
  const currentLabel =
    roomNumber != null
      ? getRoomDisplayName({ room_number: roomNumber, room_name: roomName })
      : null;

  return (
    <section>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="flex items-center gap-2">
          <Bed size={14} className="text-orange-500" />
          Room Allocation
        </span>
        <span className="h-px flex-1 bg-gray-200" />
      </h3>
      <RoomAllocationSelect
        businessId={businessId}
        bookingId={bookingId}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        currentRoomId={roomId}
        currentRoomLabel={currentLabel}
        onAssigned={onAssigned}
      />
    </section>
  );
}
