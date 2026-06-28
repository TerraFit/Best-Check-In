import { useState, useMemo, useCallback, useEffect } from 'react';
import { VisitorOriginExplorer } from '../../components/analytics/VisitorOriginExplorer';
import { 
  transformBookingsToVisitorOrigins, 
} from '../../services/visitorOriginAdapter';
import { GuestOriginsChart } from '../../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../../components/dashboard/ReferralSourcesChart';
import { TravelPatternsCard } from '../../components/analytics/TravelPatternsCard';
import { LengthOfStayChart } from '../../components/dashboard/LengthOfStayChart';
import { SubscriptionTier, SubscriptionLimits, Booking } from '../../types';
import { 
  Sparkles,
  RefreshCw,
  Database,
  Cloud,
  AlertCircle
} from 'lucide-react';

// ============================================================
// 📦 DEMO DATA
// ============================================================
const DEMO_BOOKINGS: Booking[] = [
  // ... your 8 demo bookings here (same as before)
];

// ============================================================
// 📊 REPORTS TAB COMPONENT
// ============================================================

interface ReportsTabProps {
  initialBookings?: Booking[];
  onDataChange?: (bookings: Booking[]) => void;
  initialTier?: SubscriptionTier;
  supabaseClient?: any;
}

interface DataSourceState {
  type: 'live' | 'demo';
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  business: 'Business'
};

// ============================================================
// 📊 ANALYTICS HOOK
// ============================================================
const useAnalytics = (bookings: Booking[], tier: SubscriptionTier) => {
  // ... same as before
};

export function ReportsTab({ 
  initialBookings, 
  onDataChange,
  initialTier = 'pro',
  supabaseClient: supabaseClientProp
}: ReportsTabProps = {}) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const [activeTier, setActiveTier] = useState<SubscriptionTier>(initialTier);
  const [guestChartType, setGuestChartType] = useState<'donut' | 'bar'>('donut');
  const [referralChartType, setReferralChartType] = useState<'donut' | 'bar'>('donut');
  
  const [dataSource, setDataSource] = useState<DataSourceState>({
    type: 'live',
    bookings: initialBookings || [],
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  // ============================================================
  // 🔄 AUTO-FETCH LIVE DATA ON MOUNT
  // ============================================================
  useEffect(() => {
    if (initialBookings && initialBookings.length > 0) {
      setDataSource({
        type: 'live',
        bookings: initialBookings,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      });
      return;
    }
    
    fetchLiveBookings();
  }, []);

  // ============================================================
  // 🔄 CALLBACK WHEN DATA CHANGES
  // ============================================================
  useEffect(() => {
    if (onDataChange && dataSource.bookings.length > 0) {
      onDataChange(dataSource.bookings);
    }
  }, [dataSource.bookings, onDataChange]);

  // ============================================================
  // 🔄 FETCH LIVE DATA - ✅ FIXED: No dynamic import
  // ============================================================
  const fetchLiveBookings = useCallback(async () => {
    setDataSource(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // ✅ Only use prop or window
      const supabase = supabaseClientProp || (window as any).supabase;
      
      if (!supabase) {
        throw new Error('Supabase client not available. Please check your configuration.');
      }
      
      const { data, error } = await supabase
        .from('business_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setDataSource({
          type: 'demo',
          bookings: DEMO_BOOKINGS,
          isLoading: false,
          error: 'No live bookings found. Showing demo data.',
          lastUpdated: new Date()
        });
        return;
      }
      
      const bookings = data.map((raw: any) => ({
        id: raw.id || raw.booking_id,
        guestName: raw.guest_name || raw.guestName || '',
        email: raw.email || '',
        phone: raw.phone || '',
        country: raw.guest_country || raw.country || '',
        city: raw.guest_city || raw.city || '',
        province: raw.guest_province || raw.province || '',
        passportOrId: raw.passport_or_id || raw.passportOrId || '',
        nextDestination: raw.next_destination || raw.nextDestination || '',
        checkInDate: raw.check_in_date || raw.checkInDate || '',
        checkOutDate: raw.check_out_date || raw.checkOutDate || '',
        nights: raw.nights || 0,
        settlementMethod: raw.settlement_method || raw.settlementMethod || 'Cash',
        referralSource: raw.referral_source || raw.referralSource || 'Google',
        booking_source: raw.booking_source || '',
        referral_source: raw.referral_source || '',
        guests: raw.guests || 1,
        adults: raw.adults || 1,
        kids: raw.kids || 0,
        roomType: raw.room_type || raw.roomType || 'Lodge Room',
        totalAmount: raw.total_amount || raw.totalAmount || 0,
        status: raw.status || 'Confirmed',
        year: raw.year || new Date().getFullYear(),
        month: raw.month || new Date().toLocaleString('default', { month: 'short' }),
        popiaMarketingConsent: raw.popia_marketing_consent || raw.popiaMarketingConsent || false,
        timestamp: raw.timestamp || raw.created_at || new Date().toISOString(),
        tenantId: raw.tenant_id || raw.tenantId,
        source: raw.source || 'csv_import',
        season: raw.season || 'Mid',
        arriving_from: raw.arriving_from || raw.arrivingFrom || '',
        next_destination: raw.next_destination || raw.nextDestination || '',
      }));
      
      setDataSource({
        type: 'live',
        bookings: bookings,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      });
      
    } catch (err) {
      console.error('Failed to fetch live bookings:', err);
      setDataSource({
        type: 'demo',
        bookings: DEMO_BOOKINGS,
        isLoading: false,
        error: `Live data unavailable: ${err instanceof Error ? err.message : 'Unknown error'}. Using demo data.`,
        lastUpdated: new Date()
      });
    }
  }, [supabaseClientProp]);

  // ============================================================
  // 🔄 SWITCH DATA SOURCE
  // ============================================================
  const switchToDemoMode = useCallback(() => {
    setDataSource({
      type: 'demo',
      bookings: DEMO_BOOKINGS,
      isLoading: false,
      error: null,
      lastUpdated: new Date()
    });
  }, []);

  const switchToLiveData = useCallback(async () => {
    await fetchLiveBookings();
  }, [fetchLiveBookings]);

  // ============================================================
  // 📊 MEMOIZED TRANSFORMED DATA
  // ============================================================
  const adaptedVisitors = useMemo(() => {
    return transformBookingsToVisitorOrigins(dataSource.bookings);
  }, [dataSource.bookings]);

  // ============================================================
  // 📊 USE ANALYTICS HOOK
  // ============================================================
  const { analyticsData, limits } = useAnalytics(dataSource.bookings, activeTier);

  // ============================================================
  // 📈 TRAVEL PATTERNS DATA
  // ============================================================
  const travelData = useMemo(() => {
    // ... same as before
  }, [dataSource.bookings]);

  // ============================================================
  // 📈 STATISTICS
  // ============================================================
  const stats = useMemo(() => {
    // ... same as before
  }, [dataSource.bookings]);

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Data Source Selector */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-stone-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics & Reports</h2>
          <p className="text-sm text-gray-500">Understand your guest demographics and booking patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Demo Mode Button - Dark Yellow */}
            <button
              onClick={switchToDemoMode}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                dataSource.type === 'demo'
                  ? 'bg-yellow-700 text-white border-yellow-800'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
              }`}
            >
              <Database size={12} className="inline mr-1" />
              Demo Mode
            </button>
            
            {/* Live Button - Green */}
            <button
              onClick={switchToLiveData}
              disabled={dataSource.isLoading}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                dataSource.type === 'live'
                  ? 'bg-green-600 text-white border-green-700'
                  : 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {dataSource.isLoading ? (
                <RefreshCw size={12} className="animate-spin inline mr-1" />
              ) : (
                <Cloud size={12} className="inline mr-1" />
              )}
              Live
            </button>
          </div>
          {dataSource.error && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} />
              {dataSource.error}
            </span>
          )}
          {dataSource.lastUpdated && (
            <span className="text-xs text-stone-400">
              Updated: {dataSource.lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Check-Ins</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          {dataSource.type === 'demo' && (
            <p className="text-xs text-yellow-600 mt-1">Demo Mode</p>
          )}
          {analyticsData.totalBookings > 0 && dataSource.type === 'live' && (
            <p className="text-xs text-green-600 mt-1">
              {analyticsData.totalBookings} total bookings
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Unique Countries</p>
          <p className="text-2xl font-bold text-gray-900">{stats.countryCount}</p>
          {analyticsData.uniqueCountries > 0 && dataSource.type === 'live' && (
            <p className="text-xs text-green-600 mt-1">
              {analyticsData.uniqueCountries} countries
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">QR Code Scan</p>
          <p className="text-2xl font-bold text-gray-900">{stats.qrPercentage}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            R{dataSource.bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString()}
          </p>
          {analyticsData.totalRevenue > 0 && dataSource.type === 'live' && (
            <p className="text-xs text-green-600 mt-1">
              Avg: R{(analyticsData.totalRevenue / analyticsData.totalBookings || 0).toFixed(0)}
            </p>
          )}
        </div>
      </div>

      {/* Visitor Origin Explorer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-orange-500" />
            Interactive Map Engine
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-stone-100 rounded-lg text-xs font-medium capitalize">
              {TIER_LABELS[activeTier]}
            </span>
            {dataSource.type === 'demo' && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium">
                Demo
              </span>
            )}
          </div>
        </div>
        <VisitorOriginExplorer
          data={adaptedVisitors}
          limits={limits}
          onTierChange={setActiveTier}
          isLoading={dataSource.isLoading}
        />
      </div>

      {/* Guest Origins & Referral Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GuestOriginsChart
          bookings={dataSource.bookings}
          chartType={guestChartType}
          onChartTypeChange={setGuestChartType}
        />
        <ReferralSourcesChart
          bookings={dataSource.bookings}
          chartType={referralChartType}
          onChartTypeChange={setReferralChartType}
        />
      </div>

      {/* Travel Patterns & Length of Stay */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TravelPatternsCard
          arrivingFrom={travelData.arrivingFrom}
          goingTo={travelData.goingTo}
          isLoading={dataSource.isLoading}
          title="Guest Travel Patterns"
        />
        <LengthOfStayChart bookings={dataSource.bookings} />
      </div>
    </div>
  );
}
