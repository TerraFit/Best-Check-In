import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, NavigationTabs } from '../components/dashboard';
import RoomSettings from './RoomSettings';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';

interface BusinessSummary {
  id?: string;
  trading_name?: string;
  slogan?: string;
  logo_url?: string;
  phone?: string;
  total_rooms?: number;
}

function getStoredBusinessSummary(): BusinessSummary | null {
  try {
    const stored = localStorage.getItem('business');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;

    const rawTotalRooms = parsed.total_rooms;
    const totalRooms = typeof rawTotalRooms === 'number'
      ? rawTotalRooms
      : Number.isFinite(Number(rawTotalRooms))
        ? Number(rawTotalRooms)
        : undefined;

    return {
      id: parsed.id,
      trading_name: parsed.trading_name || parsed.name || '',
      slogan: parsed.slogan || '',
      logo_url: parsed.logo_url || '',
      phone: parsed.phone || parsed.mobile_phone || '',
      total_rooms: totalRooms,
    };
  } catch {
    return null;
  }
}

export default function RoomsDashboardTab() {
  const navigate = useNavigate();
  const { getBusinessId, handleLogout } = useAuth();
  const [business, setBusiness] = useState<BusinessSummary | null>(() => getStoredBusinessSummary());
  const [refreshing, setRefreshing] = useState(false);
  const businessId = getBusinessId() || business?.id || '';

  const loadBusiness = useCallback(async () => {
    if (!businessId) return;
    setRefreshing(true);
    try {
      const response = await fetch(`/.netlify/functions/get-business-branding?id=${encodeURIComponent(businessId)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const source = data?.data || data || {};
      const totalRooms = source.total_rooms ?? data?.total_rooms ?? null;
      const parsedTotalRooms = typeof totalRooms === 'number'
        ? totalRooms
        : Number.isFinite(Number(totalRooms))
          ? Number(totalRooms)
          : undefined;

      setBusiness((previous) => ({
        ...(previous || {}),
        id: source.id || previous?.id || businessId,
        trading_name: source.trading_name || source.name || previous?.trading_name || '',
        slogan: source.slogan || previous?.slogan || '',
        logo_url: source.logo_url || previous?.logo_url || '',
        phone: source.phone || source.mobile_phone || previous?.phone || '',
        total_rooms: parsedTotalRooms ?? previous?.total_rooms,
      }));
    } catch (error) {
      console.error('Failed to load business summary for Rooms:', error);
      setBusiness((previous) => previous || getStoredBusinessSummary() || { id: businessId });
    } finally {
      setRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => { loadBusiness(); }, [loadBusiness]);

  const handleTabChange = (tabId: string) => {
    if (tabId === 'rooms') return;
    navigate(`/business/dashboard?tab=${encodeURIComponent(tabId)}`);
  };

  const licensedRooms = business?.total_rooms ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        business={business}
        refreshing={refreshing}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{t('rooms_licensed_capacity')}</p>
          <p className="text-2xl font-bold text-gray-900">{t('rooms_licensed_rooms')} <span className="text-orange-600">{licensedRooms ?? '—'}</span></p>
          <p className="text-xs text-gray-500 mt-2">{t('rooms_licensed_help')}</p>
        </div>

        <div
          className="rooms-dashboard-embedded"
          style={{
            // RoomSettings is retained as the functional editor. Its legacy shell is hidden below.
          }}
        >
          <style>{`
            .rooms-dashboard-embedded > .min-h-screen > header { display: none; }
            .rooms-dashboard-embedded > .min-h-screen > main > section:first-child { display: none; }
            .rooms-dashboard-embedded > .min-h-screen { min-height: 0; background: transparent; }
            .rooms-dashboard-embedded > .min-h-screen > main { max-width: none; padding: 0; }
          `}</style>
          <RoomSettings />
        </div>
      </main>
    </div>
  );
}
