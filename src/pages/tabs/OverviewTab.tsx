// src/pages/tabs/OverviewTab.tsx
// ✅ Pass session to GuestOverviewTab

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
  session: {
    user: {
      id: string;
      full_name: string;
      role: 'owner' | 'EmployeeOverview';
      business_id: string;
    };
  };
}

export function OverviewTab({
  business,
  todayArrivals,
  todayStayovers,
  todayCheckouts,
  businessId,
  onShowQRModal,
  onShowImportModal,
  session  // ✅ Added session prop
}: OverviewTabProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGuestClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsModalOpen(true);
  };

  const wrapGuestCards = (guests: any[]) => {
    return guests.map((guest: any) => ({
      ...guest,
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
          businessId={businessId}
          session={session}  // ✅ Pass session to TodayActivityCards
          onGuestClick={handleGuestClick}
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
        session={session}  // ✅ Pass session to GuestDetailsModal
      />
    </>
  );
}
