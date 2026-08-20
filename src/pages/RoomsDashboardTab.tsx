import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, NavigationTabs } from '../components/dashboard';
import RoomSettings from './RoomSettings';
import { useAuth } from '../hooks/useAuth';
import { useBusinessData } from '../hooks/useBusinessData';
import { t } from '../i18n';

interface BusinessSummary {
  id?: string;
  trading_name?: string;
  slogan?: string;
  logo_url?: string;
  phone?: string;
  total_rooms?: number;
}

interface RoomsDashboardTabProps {
  embedded?: boolean;
  businessOverride?: BusinessSummary | null;
}

function readCachedBusiness(): BusinessSummary | null {
  try {
    const raw = localStorage.getItem('business');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as BusinessSummary;
  } catch {
    return null;
  }
}

export default function RoomsDashboardTab({ embedded = false, businessOverride = null }: RoomsDashboardTabProps) {
  const navigate = useNavigate();
  const { getBusinessId, handleLogout } = useAuth();
  const cachedBusiness = readCachedBusiness();
  const [fallbackBusiness, setFallbackBusiness] = useState<BusinessSummary | null>(businessOverride || cachedBusiness);
  const [refreshing, setRefreshing] = useState(false);

  const { business: loadedBusiness, loading: businessLoading, refreshData } =
    useBusinessData('rooms', 1, 1, {});

  const business = (businessOverride || loadedBusiness || fallbackBusiness) as BusinessSummary | null;

  useEffect(() => {
    if (businessOverride) {
      setFallbackBusiness(businessOverride);
    } else if (loadedBusiness) {
      const next = loadedBusiness as BusinessSummary;
      setFallbackBusiness(next);
      try {
        localStorage.setItem('business', JSON.stringify(loadedBusiness));
      } catch {
        // Cache is optional; the in-memory dashboard state remains authoritative.
      }
    }
  }, [businessOverride, loadedBusiness]);

  const loadBusiness = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleTabChange = (tabId: string) => {
    if (tabId === 'rooms') return;
    navigate(`/business/dashboard?tab=${encodeURIComponent(tabId)}`);
  };

  const licensedRooms = business?.total_rooms ?? null;

  const roomContent = (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{t('rooms_licensed_capacity')}</p>
        <p className="text-2xl font-bold text-gray-900">
          {t('rooms_licensed_rooms')} <span className="text-orange-600">{licensedRooms ?? '—'}</span>
        </p>
        <p className="text-xs text-gray-500 mt-2">{t('rooms_licensed_help')}</p>
      </div>

      <div className="rooms-dashboard-embedded">
        <style>{`
          .rooms-dashboard-embedded > .min-h-screen > header { display: none; }
          .rooms-dashboard-embedded > .min-h-screen > main > section:first-child { display: none; }
          .rooms-dashboard-embedded > .min-h-screen { min-height: 0; background: transparent; }
          .rooms-dashboard-embedded > .min-h-screen > main { max-width: none; padding: 0; }
        `}</style>
        <RoomSettings />
      </div>
    </>
  );

  if (embedded) return <div>{roomContent}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        business={business}
        refreshing={refreshing || businessLoading}
        onRefresh={loadBusiness}
        onLogout={handleLogout}
      />
      <NavigationTabs
        tabs={[
          { id: 'overview', name: t('dashboard_overview') },
          { id: 'checkins', name: t('dashboard_checkins') },
          { id: 'reports', name: t('dashboard_reports') },
          { id: 'rooms', name: t('nav_rooms') },
          { id: 'housekeeping', name: t('nav_housekeeping') },
          { id: 'lost_found', name: t('nav_lost_found') },
          { id: 'staff', name: t('nav_staff') },
          { id: 'settings', name: t('dashboard_settings') },
        ]}
        activeTab="rooms"
        onTabChange={handleTabChange}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{roomContent}</main>
    </div>
  );
}
