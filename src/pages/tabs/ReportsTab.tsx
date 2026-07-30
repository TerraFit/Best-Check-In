import { useState, useMemo, useEffect } from 'react';
import { VisitorOriginExplorer } from '../../components/analytics/VisitorOriginExplorer';
import { transformBookingsToVisitorOrigins } from '../../services/visitorOriginAdapter';
import { GuestOriginsChart } from '../../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../../components/dashboard/ReferralSourcesChart';
import { TravelPatternsCard } from '../../components/analytics/TravelPatternsCard';
import { LengthOfStayChart } from '../../components/dashboard/LengthOfStayChart';
import { SubscriptionTier, SubscriptionLimits, Booking } from '../../types';
import { Sparkles, Database, Cloud } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { getAnalyticsLimits } from '../../services/featureAccessService';
import { getPackage, normalizePlanId } from '../../config/packages';
import { getBusinessId } from '../../utils/auth';

const MOCK_BOOKINGS: Booking[] = [];

interface ReportsTabProps {
  bookings: Booking[];
  totalBookings: number;
}

export function ReportsTab({ bookings }: ReportsTabProps) {
  const { t } = useTranslation();
  const [effectivePlan, setEffectivePlan] = useState<SubscriptionTier>('starter');
  const [devOverride, setDevOverride] = useState<SubscriptionTier | null>(null);
  const [guestChartType, setGuestChartType] = useState<'donut' | 'bar'>('donut');
  const [referralChartType, setReferralChartType] = useState<'donut' | 'bar'>('donut');
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    const businessId = getBusinessId();
    if (!businessId) return;
    fetch(`/.netlify/functions/get-subscription-status?businessId=${businessId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.plan) setEffectivePlan(normalizePlanId(data.plan) as SubscriptionTier);
      })
      .catch(() => {});
  }, []);

  const activePlan = (devOverride || effectivePlan) as SubscriptionTier;

  const activeBookings = useMemo(() => {
    return useMockData && MOCK_BOOKINGS.length ? MOCK_BOOKINGS : bookings;
  }, [useMockData, bookings]);

  const adaptedVisitors = useMemo(() => {
    return transformBookingsToVisitorOrigins(activeBookings || []);
  }, [activeBookings]);

  const travelData = useMemo(() => {
    const data = activeBookings || [];
    const total = data.length || 1;
    const arrivingMap = new Map<string, { count: number; country: string }>();
    data.forEach((b) => {
      const location = (b as any).arriving_from;
      const country = b.guest_country || b.country || 'Unknown';
      if (location && String(location).trim() !== '') {
        if (!arrivingMap.has(location)) arrivingMap.set(location, { count: 0, country });
        arrivingMap.get(location)!.count++;
      }
    });
    const goingMap = new Map<string, { count: number; country: string }>();
    data.forEach((b) => {
      const location = (b as any).next_destination;
      const country = b.guest_country || b.country || 'Unknown';
      if (location && String(location).trim() !== '') {
        if (!goingMap.has(location)) goingMap.set(location, { count: 0, country });
        goingMap.get(location)!.count++;
      }
    });
    const arrivingFrom = Array.from(arrivingMap.entries())
      .map(([location, d]) => ({
        location,
        country: d.country,
        count: d.count,
        percentage: (d.count / total) * 100,
        isCorrection: false,
      }))
      .sort((a, b) => b.count - a.count);
    const goingTo = Array.from(goingMap.entries())
      .map(([location, d]) => ({
        location,
        country: d.country,
        count: d.count,
        percentage: (d.count / total) * 100,
        isCorrection: false,
      }))
      .sort((a, b) => b.count - a.count);
    return { arrivingFrom, goingTo };
  }, [activeBookings]);

  const limits: SubscriptionLimits = useMemo(() => {
    const l = getAnalyticsLimits(activePlan);
    return {
      subscriptionTier: l.subscriptionTier as SubscriptionTier,
      canViewCountries: l.canViewCountries,
      canViewRegions: l.canViewRegions,
      canViewCities: l.canViewCities,
      maxDrillLevel: l.maxDrillLevel,
    };
  }, [activePlan]);

  const stats = useMemo(() => {
    const total = adaptedVisitors.length;
    if (total === 0) {
      return { total: 0, countryCount: 0, qrPercentage: '0%', topCountries: [] as { country: string; count: number }[] };
    }
    const countryMap = new Map<string, number>();
    adaptedVisitors.forEach((v) =>
      countryMap.set(v.country, (countryMap.get(v.country) || 0) + 1)
    );
    const qrCount = adaptedVisitors.filter((v) => v.checkInMethod === 'QR Code').length;
    const qrPercentage = ((qrCount / total) * 100).toFixed(0) + '%';
    const topCountries = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([country, count]) => ({ country, count }));
    return { total, countryCount: countryMap.size, qrPercentage, topCountries };
  }, [adaptedVisitors]);

  const isDev = import.meta.env.DEV;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-stone-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard_reports')}</h2>
          <p className="text-sm text-gray-500">{t('reports_description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseMockData(false)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                !useMockData
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              <Cloud size={12} className="inline mr-1" />
              {t('reports_live')}
            </button>
            <button
              onClick={() => setUseMockData(true)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                useMockData
                  ? 'bg-orange-50 text-orange-700 border-orange-300'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              <Database size={12} className="inline mr-1" />
              {t('reports_demo')}
            </button>
          </div>
          <span className="text-xs text-stone-400">
            {activeBookings?.length || 0} {t('dashboard_total_checkins')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('dashboard_total_checkins')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('reports_unique_countries')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.countryCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('reports_qr_adoption')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.qrPercentage}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('reports_revenue')}</p>
          <p className="text-2xl font-bold text-gray-900">
            R{(activeBookings || []).reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-orange-500" />
            {t('reports_interactive_map')}
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-stone-100 rounded-lg text-xs font-medium">
              {getPackage(activePlan).name}
            </span>
            {isDev && (
              <select
                className="text-[10px] border rounded px-1 py-0.5"
                value={activePlan}
                onChange={(e) => setDevOverride(e.target.value as SubscriptionTier)}
                title="DEV only plan override"
              >
                {(['starter', 'growth', 'pro', 'business'] as SubscriptionTier[]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <VisitorOriginExplorer
          data={adaptedVisitors}
          limits={limits}
          onTierChange={isDev ? (tier) => setDevOverride(tier as SubscriptionTier) : undefined}
          isLoading={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GuestOriginsChart
          bookings={activeBookings || []}
          chartType={guestChartType}
          onChartTypeChange={setGuestChartType}
        />
        <ReferralSourcesChart
          bookings={activeBookings || []}
          chartType={referralChartType}
          onChartTypeChange={setReferralChartType}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TravelPatternsCard
          arrivingFrom={travelData.arrivingFrom}
          goingTo={travelData.goingTo}
          isLoading={false}
          title={t('reports_travel_patterns')}
        />
        <LengthOfStayChart bookings={activeBookings || []} />
      </div>
    </div>
  );
}
