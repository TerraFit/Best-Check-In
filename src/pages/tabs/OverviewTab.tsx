import { BusinessInfoCard, TodayActivityCards, QuickActions } from '../../components/dashboard';

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
  return (
    <div className="space-y-6">
      <BusinessInfoCard business={business} />
      <TodayActivityCards
        arrivals={todayArrivals}
        stayovers={todayStayovers}
        checkouts={todayCheckouts}
      />
      <QuickActions
        businessId={businessId}
        onShowQRModal={onShowQRModal}
        onShowImportModal={onShowImportModal}
      />
    </div>
  );
}
