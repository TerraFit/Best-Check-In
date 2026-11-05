import { useEffect, useState } from 'react';
import { BusinessInfoCard, TodayActivityCards, QuickActions } from '../../components/dashboard';
import GuestDetailsModal from '../../components/dashboard/GuestDetailsModal';
import { fetchRooms } from '../../services/roomApi';
import {
  deriveReadinessFromRoom,
  readinessDotTone,
  type ReadinessDotTone,
} from '../../services/roomOperationalStateService';
import type { Room } from '../../types/room';

interface OverviewTabProps {
  business: any;
  todayArrivals: any[];
  todayStayovers: any[];
  todayCheckouts: any[];
  businessId: string;
  onShowQRModal: () => void;
  onShowImportModal: () => void;
  limitedAccess?: boolean;
}

function resolveReadinessTone(
  guest: any,
  rooms: Room[]
): ReadinessDotTone | null {
  if (!rooms.length) return null;
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
  return readinessDotTone(deriveReadinessFromRoom(room));
}

export function OverviewTab({
  business,
  todayArrivals,
  todayStayovers,
  todayCheckouts,
  businessId,
  onShowQRModal,
  onShowImportModal,
  limitedAccess = false,
}: OverviewTabProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!businessId || limitedAccess) return;
    fetchRooms(businessId, { includeInactive: true })
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [businessId, limitedAccess]);

  const handleGuestClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsModalOpen(true);
  };

  const wrapGuestCards = (guests: any[]) =>
    guests.map((guest: any) => ({
      ...guest,
      readinessTone: resolveReadinessTone(guest, rooms),
      onClick: limitedAccess ? undefined : () => handleGuestClick(guest.id),
    }));

  return (
    <>
      <div className="space-y-6">
        <BusinessInfoCard business={business} />
        <TodayActivityCards
          arrivals={wrapGuestCards(todayArrivals)}
          stayovers={wrapGuestCards(todayStayovers)}
          checkouts={wrapGuestCards(todayCheckouts)}
        />
        {!limitedAccess && <QuickActions
          businessId={businessId}
          onShowQRModal={onShowQRModal}
          onShowImportModal={onShowImportModal}
        />}
      </div>

      {!limitedAccess && <GuestDetailsModal
        isOpen={isModalOpen}
        bookingId={selectedBookingId}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBookingId(null);
        }}
        businessId={businessId}
      />}
    </>
  );
}
