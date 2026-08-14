import { useState, useEffect, useCallback } from 'react';
import { VisitorOriginExplorer } from '../../components/analytics/VisitorOriginExplorer';
import { GuestOriginsChart } from '../../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../../components/dashboard/ReferralSourcesChart';
import { TravelPatternsCard } from '../../components/analytics/TravelPatternsCard';
import { LengthOfStayChart } from '../../components/dashboard/LengthOfStayChart';
import { RoomPerformancePanel } from '../../components/analytics/RoomPerformancePanel';
import { SubscriptionTier, SubscriptionLimits, Booking } from '../../types';
import { Sparkles, FileDown, Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { getAnalyticsLimits } from '../../services/featureAccessService';
import { getPackage, normalizePlanId } from '../../config/packages';
import { getBusinessId } from '../../utils/auth';
import {
  fetchAnalyticsSummary,
  downloadAnalyticsSnapshot,
  downloadBiReport,
  defaultAnalyticsRange,
  type AnalyticsSummaryResponse,
} from '../../services/analyticsApi';

interface ReportsTabProps {
  bookings: Booking[];
  totalBookings: number;
}

export function ReportsTab({ bookings }: ReportsTabProps) {
  const { t } = useTranslation();
  const [effectivePlan, setEffectivePlan] = useState<SubscriptionTier>('starter');
  const [guestChartType, setGuestChartType] = useState<'donut' | 'bar'>('donut');
  const [referralChartType, setReferralChartType] = useState<'donut' | 'bar'>('donut');
  const defaults = defaultAnalyticsRange();
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<'snapshot' | 'bi' | null>(null);

  const businessId = getBusinessId() || '';

  useEffect(() => {
    if (!businessId) return;
    fetch(`/.netlify/functions/get-subscription-status?businessId=${businessId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.plan) setEffectivePlan(normalizePlanId(data.plan) as SubscriptionTier);
      })
      .catch(() => {});
  }, [businessId]);

  const loadSummary = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalyticsSummary({
        businessId,
        dateFrom,
        dateTo,
      });
      if (!data.success) {
        setError(data.error || 'Failed to load analytics');
        setSummary(null);
      } else {
        setSummary(data);
        if (data.meta?.plan) {
          setEffectivePlan(normalizePlanId(data.meta.plan) as SubscriptionTier);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, dateFrom, dateTo]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const activePlan = effectivePlan;
  const analyticsLimits = getAnalyticsLimits(activePlan);

  const limits: SubscriptionLimits = {
    subscriptionTier: activePlan,
    canViewCountries: analyticsLimits.canViewCountries,
    canViewRegions: analyticsLimits.canViewRegions,
    canViewCities: analyticsLimits.canViewCities,
    maxDrillLevel: (analyticsLimits.maxDrillLevel as any) || 'continents',
  };

  const s = summary?.summary;
  const occupancyRate = s?.occupancy?.occupancyRate ?? 0;

  const handleSnapshot = async () => {
    if (!businessId || !analyticsLimits.canSnapshotPdf) return;
    setPdfLoading('snapshot');
    try {
      const blob = await downloadAnalyticsSnapshot({ businessId, dateFrom, dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FastCheckIn-Analytics-Snapshot-${dateFrom}-${dateTo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Could not download snapshot');
    } finally {
      setPdfLoading(null);
    }
  };

  const handleBiReport = async () => {
    if (!businessId || !analyticsLimits.canBiReport) return;
    setPdfLoading('bi');
    try {
      const blob = await downloadBiReport({ businessId, dateFrom, dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FastCheckIn-BI-Report-${dateFrom}-${dateTo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Could not download BI report');
    } finally {
      setPdfLoading(null);
    }
  };

  // Charts still accept bookings for compatibility; prefer summary when available
  // NOTE: GuestOriginsChart / LengthOfStayChart still aggregate from bookings (dual path).
  // KPI cards and Room Performance use canonical server APIs.
  const chartBookings = bookings || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 bg-white rounded-lg shadow-sm border border-stone-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard_reports')}</h2>
          <p className="text-sm text-gray-500">{t('reports_description')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-stone-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
            />
            <label className="text-stone-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
            />
          </div>
          <span className="px-2 py-1 bg-stone-100 rounded-lg text-xs font-medium">
            {getPackage(activePlan).name}
          </span>
          {analyticsLimits.canSnapshotPdf && (
            <button
              type="button"
              onClick={handleSnapshot}
              disabled={!!pdfLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {pdfLoading === 'snapshot' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileDown size={12} />
              )}
              Snapshot PDF
            </button>
          )}
          {analyticsLimits.canBiReport && (
            <button
              type="button"
              onClick={handleBiReport}
              disabled={!!pdfLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {pdfLoading === 'bi' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileDown size={12} />
              )}
              BI Report
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('dashboard_total_checkins')}</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '—' : s?.totalBookings ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('reports_unique_countries')}</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '—' : s?.uniqueCountries ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Occupancy</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '—' : `${occupancyRate}%`}
          </p>
          <p className="text-[10px] text-stone-400 mt-1">Room nights / sellable nights (MVP)</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">SA / International</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading
              ? '—'
              : `${s?.domesticCount ?? 0} / ${s?.internationalCount ?? 0}`}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-orange-500" />
            {t('reports_interactive_map')}
          </h3>
        </div>
        <VisitorOriginExplorer
          businessId={businessId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          limits={limits}
          canInteractiveMap={analyticsLimits.canInteractiveMap}
          isLoading={loading}
        />
      </div>

      {businessId && (
        <RoomPerformancePanel
          businessId={businessId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GuestOriginsChart
          bookings={chartBookings}
          chartType={guestChartType}
          onChartTypeChange={setGuestChartType}
        />
        <ReferralSourcesChart
          bookings={chartBookings}
          chartType={referralChartType}
          onChartTypeChange={setReferralChartType}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TravelPatternsCard
          arrivingFrom={(summary?.arrivingFrom || []).map((x) => ({
            location: x.location,
            country: '',
            count: x.count,
            percentage: x.percentage,
            isCorrection: false,
          }))}
          goingTo={(summary?.goingTo || []).map((x) => ({
            location: x.location,
            country: '',
            count: x.count,
            percentage: x.percentage,
            isCorrection: false,
          }))}
          isLoading={loading}
          title={t('reports_travel_patterns')}
        />
        <LengthOfStayChart bookings={chartBookings} />
      </div>
    </div>
  );
}
