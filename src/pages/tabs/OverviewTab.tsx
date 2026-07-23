import { useState } from 'react';
import { BusinessInfoCard, TodayActivityCards, QuickActions } from '../../components/dashboard';
import GuestDetailsModal from '../../components/dashboard/GuestDetailsModal';

interface OverviewTabProps {
  business: any;
  todayArrivals: any[];
  todayStayovers: any[];
  todayCheckouts: any[];
  businessId: string;
  onShowQRModal: () => void;
  onShowImportModal: () => void;
}

export function OverviewTab({
  business,
  todayArrivals,
  todayStayovers,
  todayCheckouts,
  businessId,
  onShowQRModal,
  onShowImportModal,
}: OverviewTabProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGuestClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsModalOpen(true);
  };

  // ✅ Wrap guests with click handler and preserve all data including food_restrictions
  const wrapGuestCards = (guests: any[]) => {
    return guests.map((guest: any) => ({
      ...guest,  // ✅ Preserve all guest data including food_restrictions
      onClick: () => handleGuestClick(guest.id)
    }));
  };

  return (
    <>
      <div className="space-y-6">
        <BusinessInfoCard business={business} />
        <TodayActivityCards
          arrivals={wrapGuestCards(todayArrivals)}
          stayovers={wrapGuestCards(todayStayovers)}
          checkouts={wrapGuestCards(todayCheckouts)}
        />
        <QuickActions
          businessId={businessId}
          onShowQRModal={onShowQRModal}
          onShowImportModal={onShowImportModal}
        />
      </div>

      <GuestDetailsModal
        isOpen={isModalOpen}
        bookingId={selectedBookingId}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBookingId(null);
        }}
        businessId={businessId}
      />
    </>
  );
}
