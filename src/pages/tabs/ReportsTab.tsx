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
// 📦 DEMO DATA (Formerly Mock Data)
// ============================================================
const DEMO_BOOKINGS: Booking[] = [
  { 
    id: '101', guestName: 'John Doe', email: 'john@example.com', phone: '+27 82 123 4567',
    country: 'South Africa', city: 'Cape Town', province: 'Western Cape',
    passportOrId: 'SA123456', nextDestination: 'Stellenbosch',
    checkInDate: '2026-06-25', checkOutDate: '2026-06-28', nights: 3,
    settlementMethod: 'Card', referralSource: 'Booking.com',
    guests: 2, adults: 2, kids: 0, roomType: 'Lodge Room',
    totalAmount: 4500, status: 'Checked-In',
    year: 2026, month: 'Jun',
    popiaMarketingConsent: true,
    timestamp: '2026-06-25T10:30:00Z',
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High',
    arriving_from: 'Johannesburg', next_destination: 'Stellenbosch'
  },
  { 
    id: '102', guestName: 'Jane Smith', email: 'jane@example.com', phone: '+27 83 456 7890',
    country: 'South Africa', city: 'Stellenbosch', province: 'Western Cape',
    passportOrId: 'SA234567', nextDestination: 'Cape Town',
    checkInDate: '2026-06-25', checkOutDate: '2026-06-27', nights: 2,
    settlementMethod: 'Instant EFT', referralSource: 'Google',
    guests: 1, adults: 1, kids: 0, roomType: 'Suite',
    totalAmount: 3200, status: 'Checked-In',
    year: 2026, month: 'Jun',
    popiaMarketingConsent: true,
    timestamp: '2026-06-25T11:15:00Z',
    tenantId: 'tenant-1', source: 'csv_import', season: 'High',
    arriving_from: 'Cape Town', next_destination: 'Cape Town'
  },
  { 
    id: '103', guestName: 'Robert Johnson', email: 'robert@example.com', phone: '+27 72 789 0123',
    country: 'South Africa', city: 'Johannesburg', province: 'Gauteng',
    passportOrId: 'SA345678', nextDestination: 'Pretoria',
    checkInDate: '2026-06-25', checkOutDate: '2026-06-30', nights: 5,
    settlementMethod: 'Cash', referralSource: 'Word of mouth',
    guests: 4, adults: 2, kids: 2, roomType: 'Luxury Safari Tent',
    totalAmount: 8750, status: 'Confirmed',
    year: 2026, month: 'Jun',
    popiaMarketingConsent: false,
    timestamp: '2026-06-25T12:00:00Z',
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High',
    arriving_from: 'Pretoria', next_destination: 'Pretoria'
  },
  { 
    id: '104', guestName: 'Maria Garcia', email: 'maria@example.com', phone: '+34 612 345 678',
    country: 'Spain', city: 'Barcelona', province: 'Catalonia',
    passportOrId: 'ES789012', nextDestination: 'Madrid',
    checkInDate: '2026-06-24', checkOutDate: '2026-06-27', nights: 3,
    settlementMethod: 'Card', referralSource: 'Booking.com',
    guests: 2, adults: 2, kids: 0, roomType: 'Lodge Room',
    totalAmount: 5400, status: 'Checked-In',
    year: 2026, month: 'Jun',
    popiaMarketingConsent: true,
    timestamp: '2026-06-24T09:45:00Z',
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High',
    arriving_from: 'Madrid', next_destination: 'Madrid'
  },
  { 
    id: '105', guestName: 'Hans Mueller', email: 'hans@example.com', phone: '+49 171 234 5678',
    country: 'Germany', city: 'Munich', province: 'Bavaria',
    passportOrId: 'DE567890', nextDestination: 'Berlin',
    checkInDate: '2026-06-23', checkOutDate: '2026-06-26', nights: 3,
    settlementMethod: 'Instant EFT', referralSource: 'Google',
    guests: 1, adults: 1, kids: 0, roomType: 'Suite',
    totalAmount: 3800, status: 'Checked-In',
    year: 2026, month: 'Jun',
    popiaMarketingConsent: false,
    timestamp: '2026-06-23T16:10:00Z',
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High',
    arriving_from: 'Berlin', next_destination: 'Berlin'
  },
  { 
    id: '106', guestName: 'Emma Watson', email: 'emma@example.com', phone: '+44 7700 900123',
    country: 'United Kingdom', city: 'London', province: 'Greater London',
    passportOrId: 'GB901234', nextDestination: 'Manchester',
    checkInDate: '2026-06-22', checkOutDate: '2026-06-25', nights: 3,
    settlementMethod: 'Card', referralSource: 'Booking.com',
    guests: 2, adults: 2, kids: 0, roomType: 'Lodge Room',
    totalAmount: 6200, status: 'Completed',
    year: 2026, month: 'Jun',
    popiaMarketingConsent: true,
    timestamp: '2026-06-22T08:15:00Z',
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High',
    arriving_from: 'Manchester', next_destination: 'Manchester'
  },
  { 
    id: '107', guestName: 'Liam O\'Brien', email: 'liam@example.com', phone: '+1 415 555 0123',
    country: 'United States', city: 'San Francisco', province: 'California',
    passportOrId: 'US345678', nextDestination: 'Los Angeles',
    checkInDate: '2026-06-21', checkOutDate: '2026-06-24', nights: 3,
    settlementMethod: 'Card', referralSource: 'Facebook / Instagram',
    guests: 2, adults: 2, kids: 0, roomType: 'Luxury Safari Tent',
    totalAmount: 7500, status: 'Completed',
    year: 2026, month: 'Jun',
    popiaMarketingConsent: true,
    timestamp: '2026-06-21T19:40:00Z',
    tenantId: 'tenant-1', source: 'csv_import', season: 'High',
    arriving_from: 'Los Angeles', next_destination: 'Los Angeles'
  },
  { 
    id: '108', guestName: 'Yuki Tanaka', email: 'yuki@example.com', phone: '+81 80 1234 5678',
    country: 'Japan', city: 'Tokyo', province: 'Tokyo',
    passportOrId: 'JP567890', nextDestination: 'Osaka',
    checkInDate: '2026-06-20', checkOutDate: '2026-06-23', nights: 3,
    settlementMethod: 'Instant EFT', referralSource: 'Google',
    guests: 1, adults: 1, kids: 0, roomType: 'Lodge Room',
    totalAmount: 4800, status: 'Completed',
    year: 2026, month: 'Jun',
    popiaMarketingConsent: false,
    timestamp: '2026-06-20T07:30:00Z',
    tenantId: 'tenant-1', source: 'live_checkin', season: 'Mid',
    arriving_from: 'Osaka', next_destination: 'Osaka'
  },
];

// ============================================================
// 📊 REPORTS TAB COMPONENT
// ============================================================

interface ReportsTabProps {
  initialBookings?: Booking[];
  onDataChange?: (bookings: Booking[]) => void;
  initialTier?: SubscriptionTier;
  supabaseClient?: any; // Optional: Pass supabase client from parent
}

interface DataSourceState {
  type: 'live' | 'demo';  // ✅ Changed from 'mock' to 'demo'
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
  const analyticsData = useMemo(() => {
    const total = bookings.length;
    if (total === 0) {
      return {
        totalBookings: 0,
        uniqueCountries: 0,
        averageNights: 0,
        totalRevenue: 0,
        topCountries: [],
        referralSources: [],
        monthlyTrends: []
      };
    }

    const countryMap = new Map<string, number>();
    const referralMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    let totalNights = 0;
    let totalRevenue = 0;

    bookings.forEach(b => {
      const country = b.country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
      
      const referral = b.referralSource || b.referral_source || 'Unknown';
      referralMap.set(referral, (referralMap.get(referral) || 0) + 1);
      
      const month = b.month || new Date(b.checkInDate || '').toLocaleString('default', { month: 'short' });
      if (month) {
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
      }
      
      totalNights += b.nights || 0;
      totalRevenue += b.totalAmount || 0;
    });

    const topCountries = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));

    const referralSources = Array.from(referralMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    const monthlyTrends = Array.from(monthlyMap.entries())
      .sort((a, b) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(a[0]) - months.indexOf(b[0]);
      })
      .map(([month, count]) => ({ month, count }));

    return {
      totalBookings: total,
      uniqueCountries: countryMap.size,
      averageNights: totalNights / total,
      totalRevenue,
      topCountries,
      referralSources,
      monthlyTrends
    };
  }, [bookings]);

  const limits: SubscriptionLimits = useMemo(() => {
    const maxDrillLevelMap: Record<SubscriptionTier, SubscriptionLimits['maxDrillLevel']> = {
      starter: 'continents',
      growth: 'countries',
      pro: 'regions',
      business: 'cities'
    };

    return {
      subscriptionTier: tier,
      canViewCountries: tier !== 'starter',
      canViewRegions: ['pro', 'business'].includes(tier),
      canViewCities: tier === 'business',
      maxDrillLevel: maxDrillLevelMap[tier],
    };
  }, [tier]);

  return { analyticsData, limits };
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
  
  // ✅ START WITH LIVE (but fallback to demo if no initialBookings)
  const [dataSource, setDataSource] = useState<DataSourceState>({
    type: 'live',
    bookings: initialBookings || [],  // Start empty, will fetch live
    isLoading: true,  // Start loading
    error: null,
    lastUpdated: null
  });

  // ============================================================
  // 🔄 AUTO-FETCH LIVE DATA ON MOUNT
  // ============================================================
  useEffect(() => {
    // If initialBookings provided, use them
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
    
    // Otherwise fetch live data
    fetchLiveBookings();
  }, []); // Run once on mount

  // ============================================================
  // 🔄 CALLBACK WHEN DATA CHANGES
  // ============================================================
  useEffect(() => {
    if (onDataChange && dataSource.bookings.length > 0) {
      onDataChange(dataSource.bookings);
    }
  }, [dataSource.bookings, onDataChange]);

  // ============================================================
  // 🔄 FETCH LIVE DATA
  // ============================================================
  const fetchLiveBookings = useCallback(async () => {
    setDataSource(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Try to get supabase client from prop, window, or import
      let supabase = supabaseClientProp || (window as any).supabase;
      
      // If not found, try to import it
      if (!supabase) {
        try {
          const { supabase: importedSupabase } = await import('../../lib/supabase');
          supabase = importedSupabase;
          (window as any).supabase = supabase;
        } catch (importError) {
          throw new Error('Supabase client not found. Please initialize Supabase or switch to Demo Mode.');
        }
      }
      
      const { data, error } = await supabase
        .from('business_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // No live data - show demo with info
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
      // ✅ Fallback to demo data
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
  // 📈 STATISTICS
  // ============================================================
  const stats = useMemo(() => {
    const total = dataSource.bookings.length;
    if (total === 0) {
      return { total: 0, countryCount: 0, qrPercentage: '0%', topCountries: [] };
    }
    
    const countryMap = new Map<string, number>();
    dataSource.bookings.forEach(b => {
      const country = b.country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });
    
    const uniqueCountries = countryMap.size;
    
    const qrCount = dataSource.bookings.filter(b => 
      b.settlementMethod?.toLowerCase().includes('qr') || 
      b.source?.toLowerCase().includes('qr')
    ).length;
    const qrPercentage = total > 0 ? ((qrCount / total) * 100).toFixed(0) + '%' : '0%';
    
    const topCountries = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([country, count]) => ({ country, count }));
    
    return { total, countryCount: uniqueCountries, qrPercentage, topCountries };
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
            {/* ✅ Demo Mode Button - Dark Yellow */}
            <button
              onClick={switchToDemoMode}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                dataSource.type === 'demo'
                  ? 'bg-yellow-700 text-white border-yellow-800'  // Dark Yellow when active
                  : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'  // Light Yellow when inactive
              }`}
            >
              <Database size={12} className="inline mr-1" />
              Demo Mode
            </button>
            
            {/* ✅ Live Button - Green */}
            <button
              onClick={switchToLiveData}
              disabled={dataSource.isLoading}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                dataSource.type === 'live'
                  ? 'bg-green-600 text-white border-green-700'  // Dark Green when active
                  : 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'  // Light Green when inactive
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
