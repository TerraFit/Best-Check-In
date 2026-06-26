/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { VisitorOriginExplorer } from '../../components/analytics/VisitorOriginExplorer';
import { 
  transformBookingsToVisitorOrigins, 
  fetchAndTransformBookings,
  mapCountryToContinent 
} from '../../services/visitorOriginAdapter';
import { SubscriptionTier, SubscriptionLimits, Booking } from '../../types';
import { 
  BarChart3, 
  TrendingUp, 
  Globe2, 
  QrCode, 
  Users, 
  Database,
  Sparkles,
  Info,
  RefreshCw,
  Download,
  Cloud,
  Database as DatabaseIcon,
  AlertCircle
} from 'lucide-react';

// ============================================================
// 📦 MOCK DATA - For demonstration and package comparison
// These are real Booking objects matching the Best-Check-In schema
// ============================================================
const MOCK_BOOKINGS: Booking[] = [
  // South Africa - Western Cape
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
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High'
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
    tenantId: 'tenant-1', source: 'csv_import', season: 'High'
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
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High'
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
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High'
  },
  { 
    id: '105', guestName: 'Hans Mueller', email: 'hans@example.com', phone: '+49 171 234 5678',
    country: 'Germany', city: 'Munich', province: 'Bavaria',
    passportOrId: 'DE567890', nextDestination: 'Berlin',
    checkInDate: '2026-06-23', checkOutDate: '2026-06-26', nights: 3,
    settlementMethod: 'Instant EFT (RSA resident only)', referralSource: 'Google',
    guests: 1, adults: 1, kids: 0, roomType: 'Suite',
    totalAmount: 3800, status: 'Checked-In',
    year: 2026, month: 'Jun',
    popiaMarketingConsent: false,
    timestamp: '2026-06-23T16:10:00Z',
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High'
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
    tenantId: 'tenant-1', source: 'live_checkin', season: 'High'
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
    tenantId: 'tenant-1', source: 'csv_import', season: 'High'
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
    tenantId: 'tenant-1', source: 'live_checkin', season: 'Mid'
  },
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

// Tier labels for display
const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  business: 'Business'
};

interface StatsSummary {
  total: number;
  countryCount: number;
  qrPercentage: string;
  checkInMethodBreakdown: Record<string, number>;
  topCountries: Array<{ country: string; count: number }>;
}

export function ReportsTab() {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const [activeTier, setActiveTier] = useState<SubscriptionTier>('pro');
  const [dataSource, setDataSource] = useState<DataSourceState>({
    type: 'mock',
    bookings: MOCK_BOOKINGS,
    isLoading: false,
    error: null,
    lastUpdated: new Date()
  });

  // ============================================================
  // 🔄 REAL API CALL FUNCTION - Supabase get-business-bookings
  // ============================================================
  const fetchLiveBookings = useCallback(async () => {
    setDataSource(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 🔥 ACTUAL SUPABASE INTEGRATION
      // Replace this with your actual Supabase client call
      const supabase = (window as any).supabase; // Your Supabase client
      const { data, error } = await supabase
        .from('business_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform raw Supabase data to Booking objects
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
      setDataSource(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load live data'
      }));
    }
  }, []);

  // ============================================================
  // 🔄 SWITCH BETWEEN MOCK AND LIVE DATA
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
  // 📊 TRANSFORM BOOKINGS TO VISITOR RECORDS
  // ============================================================
  const adaptedVisitors = useMemo(() => {
    return transformBookingsToVisitorOrigins(dataSource.bookings);
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
  const statsSummary: StatsSummary = useMemo(() => {
    const total = adaptedVisitors.length;
    
    if (total === 0) {
      return { 
        total: 0, 
        countryCount: 0, 
        qrPercentage: '0%',
        checkInMethodBreakdown: {},
        topCountries: []
      };
    }

    const countryMap = new Map<string, number>();
    const methodMap = new Map<string, number>();
    
    adaptedVisitors.forEach(v => {
      countryMap.set(v.country, (countryMap.get(v.country) || 0) + 1);
      const method = v.checkInMethod || 'Unknown';
      methodMap.set(method, (methodMap.get(method) || 0) + 1);
    });

    const uniqueCountries = countryMap.size;
    const qrCount = adaptedVisitors.filter(v => v.checkInMethod === 'QR Code').length;
    const qrPercentage = ((qrCount / total) * 100).toFixed(0) + '%';

    const topCountries = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([country, count]) => ({ country, count }));

    return {
      total,
      countryCount: uniqueCountries,
      qrPercentage,
      checkInMethodBreakdown: Object.fromEntries(methodMap),
      topCountries
    };
  }, [adaptedVisitors]);

  // ============================================================
  // ⏰ AUTO-LOAD LIVE DATA ON MOUNT (Optional - comment out if not needed)
  // ============================================================
  useEffect(() => {
    // Optionally load live data on component mount
    // fetchLiveBookings();
  }, []);

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  return (
    <div className="space-y-8" id="reports-tab-container">
      {/* ============================================================
          📊 DATA SOURCE SELECTOR
          ============================================================ */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-orange-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-orange-100 text-orange-600 rounded-lg">
              <BarChart3 size={16} />
            </span>
            <span className="text-xs font-mono font-extrabold uppercase text-orange-600 tracking-wider">
              Best-Check-In Integration Module
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            FastCheckin Visitor Explorer
          </h2>
          <p className="text-sm text-stone-500">
            Compare package features with mock data or connect to your live Supabase database.
          </p>
        </div>

        {/* Data Source Controls */}
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={switchToMockData}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all ${
                dataSource.type === 'mock'
                  ? 'bg-orange-50 text-orange-700 border-orange-300 shadow-sm'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
              }`}
            >
              <Database size={12} />
              Mock Data (Demo)
            </button>
            
            <button
              onClick={switchToLiveData}
              disabled={dataSource.isLoading}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all ${
                dataSource.type === 'live'
                  ? 'bg-green-50 text-green-700 border-green-300 shadow-sm'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {dataSource.isLoading ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Cloud size={12} />
              )}
              Live Data (Supabase)
            </button>
          </div>
          
          {/* Status Badge */}
          {dataSource.type === 'live' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-mono font-bold rounded-xl border border-green-200">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-ping"></span>
              <span>Live: Connected</span>
              {dataSource.lastUpdated && (
                <span className="text-green-500/70">
                  • Updated {dataSource.lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
          
          {dataSource.type === 'mock' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-mono font-bold rounded-xl border border-orange-200">
              <DatabaseIcon size={12} />
              <span>Demo: Using sample data</span>
            </div>
          )}
          
          {dataSource.error && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-mono font-bold rounded-xl border border-red-200">
              <AlertCircle size={12} />
              <span>Error: {dataSource.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          📊 STATS CARDS
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="reports-stats-row">
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-stone-300">
          <div className="space-y-1.5">
            <span className="text-xs font-extrabold text-stone-400 uppercase tracking-wider block">Total Check-Ins</span>
            <span className="text-3xl font-black text-stone-900 tracking-tight block">
              {statsSummary.total}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp size={12} /> 
              {dataSource.type === 'live' ? 'Live records' : 'Demo records'}
            </span>
          </div>
          <div className="p-4 bg-orange-50 rounded-2xl text-orange-500">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-stone-300">
          <div className="space-y-1.5">
            <span className="text-xs font-extrabold text-stone-400 uppercase tracking-wider block">Unique Countries</span>
            <span className="text-3xl font-black text-stone-900 tracking-tight block">
              {statsSummary.countryCount}
            </span>
            <span className="text-[10px] text-stone-400 font-mono block">
              {statsSummary.topCountries.length > 0 && (
                <>
                  Top: {statsSummary.topCountries.map((c, i) => 
                    `${c.country} (${c.count})${i < statsSummary.topCountries.length - 1 ? ', ' : ''}`
                  )}
                </>
              )}
            </span>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500">
            <Globe2 size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-stone-300">
          <div className="space-y-1.5">
            <span className="text-xs font-extrabold text-stone-400 uppercase tracking-wider block">QR Code Scan</span>
            <span className="text-3xl font-black text-stone-900 tracking-tight block">
              {statsSummary.qrPercentage}
            </span>
            <span className="text-[10px] text-purple-600 font-bold block">Convenient check-in channel</span>
          </div>
          <div className="p-4 bg-purple-50 rounded-2xl text-purple-500">
            <QrCode size={24} />
          </div>
        </div>
      </div>

      {/* ============================================================
          🗺️ VISITOR ORIGIN EXPLORER
          ============================================================ */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-extrabold text-stone-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-orange-500 animate-pulse" />
              Interactive Map Engine
            </h3>
            {dataSource.lastUpdated && (
              <span className="text-xs text-stone-400 font-mono">
                {dataSource.type === 'live' ? 'Live' : 'Demo'} data • Updated: {dataSource.lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {dataSource.type === 'live' && (
              <button
                onClick={fetchLiveBookings}
                disabled={dataSource.isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 text-xs font-bold text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={dataSource.isLoading ? 'animate-spin' : ''} />
                {dataSource.isLoading ? 'Loading...' : 'Refresh'}
              </button>
            )}
            
            <div className="flex items-center gap-2 bg-stone-100 px-3 py-1 rounded-xl border border-stone-200 text-xs">
              <span className="font-bold text-stone-500">Plan View:</span>
              <select
                value={activeTier}
                onChange={(e) => setActiveTier(e.target.value as SubscriptionTier)}
                className="font-extrabold uppercase text-orange-600 bg-transparent border-none focus:ring-0 cursor-pointer"
              >
                {Object.entries(TIER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <VisitorOriginExplorer
          data={adaptedVisitors}
          limits={limits}
          onTierChange={setActiveTier}
          isLoading={dataSource.isLoading}
        />
      </div>

      {/* ============================================================
          📝 INTEGRATION GUIDE
          ============================================================ */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-stone-950 tracking-tight">
          How to connect to your Supabase database
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Mock Data Section */}
          <div className="space-y-2 p-4 bg-orange-50 rounded-2xl border border-orange-200">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-xs">📦</span>
              <h5 className="text-xs font-bold text-stone-900">Mock Data (Demo)</h5>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Pre-loaded sample data based on the <strong>Booking</strong> interface allows you to explore all features and compare package capabilities immediately.
            </p>
            <div className="mt-2 text-[10px] font-mono text-orange-600 bg-orange-100/50 px-2 py-1 rounded">
              {statsSummary.total} records • {statsSummary.countryCount} countries
            </div>
          </div>

          {/* Live Data Section */}
          <div className="space-y-2 p-4 bg-green-50 rounded-2xl border border-green-200">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">🔌</span>
              <h5 className="text-xs font-bold text-stone-900">Live Supabase Integration</h5>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Click <strong>"Live Data"</strong> to fetch real records from your <code className="bg-green-200 px-1 py-0.5 rounded font-mono text-[10px]">business_bookings</code> table via the Supabase client.
            </p>
            <div className="mt-2 text-[10px] font-mono text-green-700 bg-green-100/50 px-2 py-1 rounded">
              {dataSource.type === 'live' ? `✅ Connected • ${statsSummary.total} records` : '⏳ Click to connect'}
            </div>
          </div>
        </div>

        {/* Implementation Notes */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-stone-400" />
            <span className="text-xs font-bold text-stone-600">Implementation Notes</span>
          </div>
          <ul className="text-[11px] text-stone-500 leading-relaxed space-y-1 list-disc list-inside">
            <li>
              <strong>Mock Data:</strong> Perfect for demos, package comparisons, and UI testing. No database setup required.
            </li>
            <li>
              <strong>Live Data:</strong> Replace the <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px]">supabase.from('business_bookings')</code> call with your actual Supabase client configuration.
            </li>
            <li>
              <strong>Adapter:</strong> The <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px]">transformBookingsToVisitorOrigins</code> function handles the transformation from <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px]">Booking</code> to <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px]">VisitorRecord</code>.
            </li>
            <li>
              <strong>Country Mapping:</strong> The <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px]">mapCountryToContinent</code> function automatically determines continents from country names.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
