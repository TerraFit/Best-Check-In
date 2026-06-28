// src/pages/tabs/ReportsTab.tsx
// ✅ FINAL VERSION - Demo/Live toggle, Mock data for demo, Live by default
import { useState, useMemo, useEffect } from 'react';
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
  TrendingUp, 
  Globe2, 
  QrCode, 
  Users, 
  Sparkles,
  Database,
  Cloud
} from 'lucide-react';

// ============================================================
// 📦 MOCK DATA - For demo/testing only
// ============================================================
const MOCK_BOOKINGS: Booking[] = [
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
  bookings: Booking[];
  totalBookings: number;
  // ... other props from parent
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  business: 'Business'
};

export function ReportsTab({ bookings }: ReportsTabProps) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const [activeTier, setActiveTier] = useState<SubscriptionTier>('pro');
  const [guestChartType, setGuestChartType] = useState<'donut' | 'bar'>('donut');
  const [referralChartType, setReferralChartType] = useState<'donut' | 'bar'>('donut');
  
  // ✅ Default to Live data (false = live, true = demo)
  const [useMockData, setUseMockData] = useState(false);

  // ============================================================
  // 📊 SELECT DATA SOURCE (Real or Mock)
  // ============================================================
  const activeBookings = useMemo(() => {
    return useMockData ? MOCK_BOOKINGS : bookings;
  }, [useMockData, bookings]);

  // ============================================================
  // 📊 TRANSFORM BOOKINGS TO VISITOR ORIGINS
  // ============================================================
  const adaptedVisitors = useMemo(() => {
    return transformBookingsToVisitorOrigins(activeBookings || []);
  }, [activeBookings]);

  // ============================================================
  // 📈 TRAVEL PATTERNS DATA - WITH PROPER FIELD MAPPING
  // ============================================================
  const travelData = useMemo(() => {
    const data = activeBookings || [];
    const total = data.length || 1;
    
    console.log('🔍 Travel Data - Sample booking:', data[0]);
    console.log('🔍 Travel Data - All arriving_from:', data.map(b => b.arriving_from));
    console.log('🔍 Travel Data - All next_destination:', data.map(b => b.next_destination));
    
    // ✅ Arriving From - use arriving_from field
    const arrivingMap = new Map<string, { count: number; country: string }>();
    data.forEach(b => {
      // Try multiple field names
      const location = b.arriving_from || (b as any).arrivingFrom || b.guest_city || b.country || 'Unknown';
      const country = b.country || 'Unknown';
      
      if (location && location !== 'Unknown') {
        if (!arrivingMap.has(location)) {
          arrivingMap.set(location, { count: 0, country });
        }
        arrivingMap.get(location)!.count++;
      }
    });
    
    // ✅ Going To - use next_destination field
    const goingMap = new Map<string, { count: number; country: string }>();
    data.forEach(b => {
      // Try multiple field names
      const location = b.next_destination || (b as any).nextDestination || b.guest_city || b.country || 'Unknown';
      const country = b.country || 'Unknown';
      
      if (location && location !== 'Unknown') {
        if (!goingMap.has(location)) {
          goingMap.set(location, { count: 0, country });
        }
        goingMap.get(location)!.count++;
      }
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
    
    console.log('📊 Travel Data - Arriving From:', arrivingFrom);
    console.log('📊 Travel Data - Going To:', goingTo);
    
    return { arrivingFrom, goingTo };
  }, [activeBookings]);

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
  // 🔍 DEBUG - Log what's being passed to charts
  // ============================================================
  useEffect(() => {
    console.log('📊 ReportsTab - Active Bookings:', activeBookings);
    console.log('📊 ReportsTab - Active Bookings count:', activeBookings?.length);
    console.log('📊 ReportsTab - First booking:', activeBookings?.[0]);
  }, [activeBookings]);

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Header with Data Source Toggle - Live by Default */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-stone-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics & Reports</h2>
          <p className="text-sm text-gray-500">Understand your guest demographics and booking patterns</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Data Source Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseMockData(false)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                !useMockData
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
              }`}
            >
              <Cloud size={12} className="inline mr-1" />
              Live
            </button>
            <button
              onClick={() => setUseMockData(true)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                useMockData
                  ? 'bg-orange-50 text-orange-700 border-orange-300'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
              }`}
            >
              <Database size={12} className="inline mr-1" />
              Demo
            </button>
          </div>
          <span className="text-xs text-stone-400">
            {activeBookings?.length || 0} bookings
          </span>
          {useMockData && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full">
              DEMO
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Check-Ins</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-[10px] text-stone-400">{useMockData ? 'Demo' : 'Live'} data</p>
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
            R{activeBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString()}
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
            {useMockData && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded">
                DEMO
              </span>
            )}
          </div>
        </div>
        <VisitorOriginExplorer
          data={adaptedVisitors}
          limits={limits}
          onTierChange={setActiveTier}
          isLoading={false}
        />
      </div>

      {/* Guest Origins & Referral Sources */}
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

      {/* Travel Patterns & Length of Stay */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TravelPatternsCard
          arrivingFrom={travelData.arrivingFrom}
          goingTo={travelData.goingTo}
          isLoading={false}
          title="Guest Travel Patterns"
        />
        <LengthOfStayChart bookings={activeBookings || []} />
      </div>
    </div>
  );
}
