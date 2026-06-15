// src/pages/tabs/OverviewTab.tsx
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

export function OverviewTab(props: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <BusinessInfoCard business={props.business} />
      <TodayActivityCards
        arrivals={props.todayArrivals}
        stayovers={props.todayStayovers}
        checkouts={props.todayCheckouts}
      />
      <QuickActions
        businessId={props.businessId}
        onShowQRModal={props.onShowQRModal}
        onShowImportModal={props.onShowImportModal}
      />
    </div>
  );
}
