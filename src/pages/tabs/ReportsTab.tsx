// src/pages/tabs/ReportsTab.tsx
// ✅ UPDATED - Uses the centralized Supabase client
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
import { supabase, isSupabaseConfigured, executeListQuery } from '../../lib/supabase';
import { 
  TrendingUp, 
  Globe2, 
  QrCode, 
  Users, 
  Sparkles,
  RefreshCw,
  Database,
  Cloud,
  AlertCircle
} from 'lucide-react';

// ============================================================
// 📦 MOCK DATA - For demo/testing only
// ============================================================
const MOCK_BOOKINGS: Booking[] = [
  // ... (keep your mock data)
];

// ============================================================
// 📊 REPORTS TAB COMPONENT
// ============================================================
interface DataSourceState {
  type: 'mock' | 'live';
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

export function ReportsTab() {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const [activeTier, setActiveTier] = useState<SubscriptionTier>('pro');
  const [guestChartType, setGuestChartType] = useState<'donut' | 'bar'>('donut');
  const [referralChartType, setReferralChartType] = useState<'donut' | 'bar'>('donut');
  
  const [dataSource, setDataSource] = useState<DataSourceState>({
    type: 'live',
    bookings: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  // ============================================================
  // 🔄 FETCH LIVE DATA USING CENTRALIZED CLIENT
  // ============================================================
  const fetchLiveBookings = useCallback(async () => {
    setDataSource(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // ✅ Check if Supabase is configured
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase client is not configured. Using demo data.');
      }

      // ✅ Use the centralized client with safe query execution
      const bookings = await executeListQuery<Booking>(async () => {
        return await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });
      });

      if (bookings.length === 0) {
        // No data in Supabase yet, fallback to mock
        setDataSource({
          type: 'mock',
          bookings: MOCK_BOOKINGS,
          isLoading: false,
          error: 'No live data found - showing demo data',
          lastUpdated: new Date()
        });
        return;
      }

      // Map Supabase fields to our Booking interface
      const mappedBookings: Booking[] = bookings.map((raw: any) => ({
        id: raw.id || raw.booking_id,
        guestName: raw.guest_name || raw.guestName || '',
        email: raw.guest_email || raw.email || '',
        phone: raw.guest_phone || raw.phone || '',
        country: raw.guest_country || raw.country || '',
        city: raw.guest_city || raw.city || '',
        province: raw.guest_province || raw.province || '',
        passportOrId: raw.passport_or_id || raw.passportOrId || raw.guest_id_number || '',
        nextDestination: raw.next_destination || raw.nextDestination || '',
        checkInDate: raw.check_in_date || raw.checkInDate || '',
        checkOutDate: raw.check_out_date || raw.checkOutDate || '',
        nights: raw.nights || 0,
        settlementMethod: raw.settlement_method || raw.settlementMethod || 'Cash',
        referralSource: raw.referral_source || raw.referralSource || 'Google',
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
        bookings: mappedBookings,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      });
      
    } catch (err) {
      console.error('Failed to fetch live bookings:', err);
      // Fallback to mock data
      setDataSource({
        type: 'mock',
        bookings: MOCK_BOOKINGS,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load live data - using demo',
        lastUpdated: new Date()
      });
    }
  }, []);

  // ============================================================
  // 🔄 LOAD DATA ON MOUNT
  // ============================================================
  useEffect(() => {
    fetchLiveBookings();
  }, [fetchLiveBookings]);

  // ============================================================
  // 🔄 SWITCH DATA SOURCE
  // ============================================================
  const switchToMockData = useCallback(() => {
    setDataSource({
      type: 'mock',
      bookings: MOCK_BOOKINGS,
      isLoading: false,
      error: null,
      lastUpdated: new Date()
    });
  }, []);

  const switchToLiveData = useCallback(async () => {
    await fetchLiveBookings();
  }, [fetchLiveBookings]);

  // ============================================================
  // 📊 TRANSFORM DATA
  // ============================================================
  const adaptedVisitors = useMemo(() => {
    return transformBookingsToVisitorOrigins(dataSource.bookings);
  }, [dataSource.bookings]);

  // ============================================================
  // 📈 TRAVEL PATTERNS DATA
  // ============================================================
  const travelData = useMemo(() => {
    const bookings = dataSource.bookings;
    const total = bookings.length || 1;
    
    const arrivingMap = new Map<string, { count: number; country: string }>();
    bookings.forEach(b => {
      const location = b.arriving_from || b.nextDestination || 'Unknown';
      const country = b.country || 'Unknown';
      if (!arrivingMap.has(location)) {
        arrivingMap.set(location, { count: 0, country });
      }
      arrivingMap.get(location)!.count++;
    });
    
    const goingMap = new Map<string, { count: number; country: string }>();
    bookings.forEach(b => {
      const location = b.next_destination || b.nextDestination || 'Unknown';
      const country = b.country || 'Unknown';
      if (!goingMap.has(location)) {
        goingMap.set(location, { count: 0, country });
      }
      goingMap.get(location)!.count++;
    });
    
    const arrivingFrom = Array.from(arrivingMap.entries()).map(([location, data]) => ({
      location,
      country: data.country,
      count: data.count,
      percentage: (data.count / total) * 100,
      isCorrection: false,
    })).sort((a, b) => b.count - a.count);
    
    const goingTo = Array.from(goingMap.entries()).map(([location, data]) => ({
      location,
      country: data.country,
      count: data.count,
      percentage: (data.count / total) * 100,
      isCorrection: false,
    })).sort((a, b) => b.count - a.count);
    
    return { arrivingFrom, goingTo };
  }, [dataSource.bookings]);

  // ============================================================
  // 🎯 TIER LIMITS
  // ============================================================
  const limits: SubscriptionLimits = useMemo(() => {
    const maxDrillLevelMap: Record<SubscriptionTier, SubscriptionLimits['maxDrillLevel']> = {
      starter: 'continents',
      growth: 'countries',
      pro: 'regions',
      business: 'cities'
    };

    return {
      subscriptionTier: activeTier,
      canViewCountries: activeTier !== 'starter',
      canViewRegions: ['pro', 'business'].includes(activeTier),
      canViewCities: activeTier === 'business',
      maxDrillLevel: maxDrillLevelMap[activeTier],
    };
  }, [activeTier]);

  // ============================================================
  // 📈 STATISTICS
  // ============================================================
  const stats = useMemo(() => {
    const total = adaptedVisitors.length;
    if (total === 0) {
      return { total: 0, countryCount: 0, qrPercentage: '0%', topCountries: [] };
    }
    const countryMap = new Map<string, number>();
    adaptedVisitors.forEach(v => countryMap.set(v.country, (countryMap.get(v.country) || 0) + 1));
    const uniqueCountries = countryMap.size;
    const qrCount = adaptedVisitors.filter(v => v.checkInMethod === 'QR Code').length;
    const qrPercentage = ((qrCount / total) * 100).toFixed(0) + '%';
    const topCountries = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([country, count]) => ({ country, count }));
    return { total, countryCount: uniqueCountries, qrPercentage, topCountries };
  }, [adaptedVisitors]);

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
            <button
              onClick={switchToMockData}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                dataSource.type === 'mock'
                  ? 'bg-orange-50 text-orange-700 border-orange-300'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
              }`}
            >
              <Database size={12} className="inline mr-1" />
              Demo
            </button>
            <button
              onClick={switchToLiveData}
              disabled={dataSource.isLoading}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                dataSource.type === 'live'
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
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
          {dataSource.type === 'live' && dataSource.lastUpdated && (
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
          <p className="text-[10px] text-stone-400">{dataSource.type === 'live' ? 'Live' : 'Demo'} data</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Unique Countries</p>
          <p className="text-2xl font-bold text-gray-900">{stats.countryCount}</p>
          {stats.topCountries.length > 0 && (
            <p className="text-[10px] text-stone-400 truncate">
              {stats.topCountries.map(c => `${c.country} (${c.count})`).join(', ')}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">QR Code Scan</p>
          <p className="text-2xl font-bold text-gray-900">{stats.qrPercentage}</p>
          <p className="text-[10px] text-stone-400">Touchless check-in</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            R{dataSource.bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-stone-400">Total bookings value</p>
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
