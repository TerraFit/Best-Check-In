import RoomSettings from './RoomSettings';
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

export default function RoomsDashboardTab({ businessOverride = null }: RoomsDashboardTabProps) {
  const business = businessOverride || readCachedBusiness();
  const licensedRooms = business?.total_rooms ?? null;

  return (
    <div className="rooms-dashboard-embedded">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
          {t('rooms_licensed_capacity')}
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {t('rooms_licensed_rooms')} <span className="text-orange-600">{licensedRooms ?? '—'}</span>
        </p>
        <p className="text-xs text-gray-500 mt-2">{t('rooms_licensed_help')}</p>
      </div>

      <style>{`
        .rooms-dashboard-embedded > .min-h-screen > header { display: none; }
        .rooms-dashboard-embedded > .min-h-screen > main > section:first-child { display: none; }
        .rooms-dashboard-embedded > .min-h-screen { min-height: 0; background: transparent; }
        .rooms-dashboard-embedded > .min-h-screen > main { max-width: none; padding: 0; }
      `}</style>

      <RoomSettings />
    </div>
  );
}
