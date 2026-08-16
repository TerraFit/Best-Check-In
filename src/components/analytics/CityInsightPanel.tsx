import { useTranslation } from '../../i18n';
import { ArrowLeft, Users, Calendar, Heart, Share2, UserPlus, MapPin } from 'lucide-react';
import type { CityDashboard } from '../../services/analyticsApi';

interface CityInsightPanelProps {
  cityName: string;
  regionName?: string | null;
  countryName?: string | null;
  data: CityDashboard | null;
  isLoading?: boolean;
  onBack: () => void;
}

export function CityInsightPanel({
  cityName,
  regionName,
  countryName,
  data,
  isLoading,
  onBack,
}: CityInsightPanelProps) {
  const { t } = useTranslation();
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-16 text-stone-400 text-sm">
        {t('reports_loading_city_insights')}
      </div>
    );
  }

  const d = data || {
    visitors: 0,
    averageStay: 0,
    returningGuestsPercent: 0,
    marketingConsentPercent: 0,
    averagePartySize: 0,
    topReferral: null,
    topMonth: null,
  };

  const cards = [
    { label: 'Visitors', value: String(d.visitors), icon: Users },
    { label: 'Average stay', value: `${d.averageStay} nights`, icon: Calendar },
    { label: 'Returning guests', value: `${d.returningGuestsPercent}%`, icon: UserPlus },
    { label: 'Marketing consent', value: `${d.marketingConsentPercent}%`, icon: Heart },
    { label: 'Average party size', value: String(d.averagePartySize), icon: Users },
    { label: 'Top referral', value: d.topReferral || '—', icon: Share2 },
    { label: 'Top month', value: d.topMonth || '—', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <MapPin size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">{t('reports_city_insight')}</span>
          </div>
          <h4 className="text-2xl font-extrabold text-stone-900">{cityName}</h4>
          <p className="text-sm text-stone-500">
            {[regionName, countryName].filter(Boolean).join(', ')}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
        >
          <ArrowLeft size={12} /> {t('common_back')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-stone-400 mb-2">
              <c.icon size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{c.label}</span>
            </div>
            <p className="text-xl font-extrabold text-stone-900 truncate">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CityInsightPanel;
