// src/pages/tabs/ReportsTab.tsx
import { useMemo } from 'react';
import { TravelPatternsCard } from '../../components/analytics/TravelPatternsCard';
import { GuestOriginsChart } from '../../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../../components/dashboard/ReferralSourcesChart';
import { LengthOfStayChart } from '../../components/dashboard/LengthOfStayChart';
import { UpgradePreview } from '../../components/analytics/UpgradePreview';
import { useAnalytics } from '../../hooks/useAnalytics';
import { SubscriptionTier } from '../../types/analytics';

// ✅ Try to import the new explorer, fallback to old map if not available
let VisitorOriginExplorer: any = null;
let VisitorOriginMap: any = null;

try {
  // Try to load the new explorer
  const explorer = require('../../components/analytics/VisitorOriginExplorer');
  VisitorOriginExplorer = explorer.VisitorOriginExplorer || explorer.default;
  console.log('✅ VisitorOriginExplorer loaded successfully');
} catch (e) {
  console.log('ℹ️ VisitorOriginExplorer not found, using fallback');
}

try {
  // Try to load the old map as fallback
  const map = require('../../components/analytics/VisitorOriginMap');
  VisitorOriginMap = map.VisitorOriginMap || map.default;
  console.log('✅ VisitorOriginMap loaded as fallback');
} catch (e) {
  console.log('⚠️ VisitorOriginMap also not found');
}

// If neither is available, create a placeholder
if (!VisitorOriginExplorer && !VisitorOriginMap) {
  console.warn('⚠️ No map component available, using placeholder');
  VisitorOriginMap = ({ data, drillLevel, limits, onDrillDown, onDrillUp, canDrillDeeper, getUpgradeMessage, isLoading }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
      <div className="text-4xl mb-4">🌍</div>
      <h3 className="text-lg font-semibold text-stone-900 mb-2">Visitor Origin Map</h3>
      <p className="text-stone-500 text-sm">Loading map component...</p>
    </div>
  );
}

interface ReportsTabProps {
  bookings: any[];
  totalBookings: number;
  todayArrivals: any[];
  todayStayovers: any[];
  todayCheckouts: any[];
  filters: any;
  onUpdateFilter: (key: string, value: any) => void;
  onClearFilters: () => void;
  isFilterActive: () => boolean;
  onFilterChange: () => void;
  guestChartType: 'donut' | 'bar';
  onGuestChartTypeChange: (type: 'donut' | 'bar') => void;
  referralChartType: 'donut' | 'bar';
  onReferralChartTypeChange: (type: 'donut' | 'bar') => void;
  onExport: () => void;
  subscriptionTier: SubscriptionTier;
}

export function ReportsTab(props: ReportsTabProps) {
  // ✅ FIX: Ensure subscriptionTier is properly passed
  const tier = props.subscriptionTier || 'starter';
  console.log('📊 ReportsTab - subscriptionTier received:', tier);
  
  const {
    analyticsData,
    drillLevel,
    setDrillLevel,
    drillPath,
    setDrillPath,
    limits,
    canDrillDeeper,
    getUpgradeMessage,
    isLoading
  } = useAnalytics(props.bookings || [], tier);
  
  console.log('📊 ReportsTab - limits:', limits);

  // Handle drill down
  const handleDrillDown = (item: any) => {
    console.log('🔽 Drill down:', item);
    if (item.children && canDrillDeeper('continent')) {
      setDrillLevel('continent');
      setDrillPath([...drillPath, item.name]);
    }
  };

  const handleDrillUp = () => {
    console.log('⬆️ Drill up from:', drillLevel);
    if (drillLevel === 'continent') {
      setDrillLevel('world');
      setDrillPath(drillPath.slice(0, -1));
    } else if (drillLevel === 'country') {
      setDrillLevel('continent');
    } else if (drillLevel === 'region') {
      setDrillLevel('country');
    } else if (drillLevel === 'city') {
      setDrillLevel('region');
    }
  };

  // ✅ Prepare data for the map - same as before (working)
  const mapData = useMemo(() => {
    const bookings = props.bookings || [];
    if (!bookings || bookings.length === 0) return [];
    
    // Aggregate by continent from guest_country
    const continentMap: Record<string, { name: string; count: number; children: any[] }> = {};
    
    bookings.forEach((b: any) => {
      const country = b.guest_country || b.country;
      if (!country) return;
      
      // Simple continent mapping
      const countryToContinent: Record<string, string> = {
        'South Africa': 'Africa',
        'Namibia': 'Africa',
        'Botswana': 'Africa',
        'Zimbabwe': 'Africa',
        'Mozambique': 'Africa',
        'Lesotho': 'Africa',
        'Eswatini': 'Africa',
        'Zambia': 'Africa',
        'Angola': 'Africa',
        'Malawi': 'Africa',
        'Tanzania': 'Africa',
        'Kenya': 'Africa',
        'Nigeria': 'Africa',
        'Ghana': 'Africa',
        'Egypt': 'Africa',
        'Morocco': 'Africa',
        'Tunisia': 'Africa',
        'Algeria': 'Africa',
        'Mauritius': 'Africa',
        'Seychelles': 'Africa',
        'Germany': 'Europe',
        'France': 'Europe',
        'United Kingdom': 'Europe',
        'Italy': 'Europe',
        'Spain': 'Europe',
        'Netherlands': 'Europe',
        'Switzerland': 'Europe',
        'Austria': 'Europe',
        'Belgium': 'Europe',
        'Portugal': 'Europe',
        'Sweden': 'Europe',
        'Norway': 'Europe',
        'Denmark': 'Europe',
        'Finland': 'Europe',
        'Greece': 'Europe',
        'Ireland': 'Europe',
        'Poland': 'Europe',
        'Czech Republic': 'Europe',
        'Hungary': 'Europe',
        'Romania': 'Europe',
        'Bulgaria': 'Europe',
        'Croatia': 'Europe',
        'Russia': 'Europe',
        'Ukraine': 'Europe',
        'United States': 'North America',
        'United States of America': 'North America',
        'Canada': 'North America',
        'Mexico': 'North America',
        'Brazil': 'South America',
        'Argentina': 'South America',
        'Chile': 'South America',
        'Colombia': 'South America',
        'Peru': 'South America',
        'Venezuela': 'South America',
        'China': 'Asia',
        'India': 'Asia',
        'Japan': 'Asia',
        'South Korea': 'Asia',
        'Singapore': 'Asia',
        'Malaysia': 'Asia',
        'Indonesia': 'Asia',
        'Thailand': 'Asia',
        'Vietnam': 'Asia',
        'Philippines': 'Asia',
        'Saudi Arabia': 'Asia',
        'United Arab Emirates': 'Asia',
        'Israel': 'Asia',
        'Turkey': 'Asia',
        'Australia': 'Oceania',
        'New Zealand': 'Oceania',
        'Fiji': 'Oceania',
      };
      
      const continent = countryToContinent[country] || 'Other';
      
      if (!continentMap[continent]) {
        continentMap[continent] = { name: continent, count: 0, children: [] };
      }
      continentMap[continent].count += 1;
      continentMap[continent].children.push({
        name: country,
        count: 1,
        percentage: 0
      });
    });
    
    const total = Object.values(continentMap).reduce((sum, c) => sum + c.count, 0) || 1;
    
    return Object.values(continentMap).map(c => ({
      name: c.name,
      count: c.count,
      percentage: (c.count / total) * 100,
      children: c.children.map((child: any) => ({
        ...child,
        percentage: (child.count / c.count) * 100
      }))
    })).sort((a, b) => b.count - a.count);
  }, [props.bookings]);

  // ✅ Prepare data for the new explorer (if available)
  const explorerData = useMemo(() => {
    const bookings = props.bookings || [];
    if (!bookings || bookings.length === 0) return [];
    
    return bookings.map((b: any) => ({
      id: b.id || `booking-${Math.random()}`,
      timestamp: b.created_at || b.check_in_date || new Date().toISOString(),
      continent: getContinentFromCountry(b.guest_country || b.country),
      country: b.guest_country || b.country || 'Unknown',
      region: b.guest_province || b.province || 'Unknown',
      city: b.guest_city || b.city || 'Unknown',
      count: 1,
      checkInMethod: b.booking_source || b.referral_source || 'QR Code',
      guestType: b.guest_type || 'First-time',
    }));
  }, [props.bookings]);

  function getContinentFromCountry(country: string): string {
    if (!country) return 'Other';
    const map: Record<string, string> = {
      'South Africa': 'Africa', 'Namibia': 'Africa', 'Botswana': 'Africa',
      'Zimbabwe': 'Africa', 'Mozambique': 'Africa', 'Lesotho': 'Africa',
      'Eswatini': 'Africa', 'Zambia': 'Africa', 'Angola': 'Africa',
      'Malawi': 'Africa', 'Tanzania': 'Africa', 'Kenya': 'Africa',
      'Nigeria': 'Africa', 'Ghana': 'Africa', 'Egypt': 'Africa',
      'Morocco': 'Africa', 'Tunisia': 'Africa', 'Algeria': 'Africa',
      'Mauritius': 'Africa', 'Seychelles': 'Africa',
      'Germany': 'Europe', 'France': 'Europe', 'United Kingdom': 'Europe',
      'Italy': 'Europe', 'Spain': 'Europe', 'Netherlands': 'Europe',
      'Switzerland': 'Europe', 'Austria': 'Europe', 'Belgium': 'Europe',
      'Portugal': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe',
      'Denmark': 'Europe', 'Finland': 'Europe', 'Greece': 'Europe',
      'Ireland': 'Europe', 'Poland': 'Europe', 'Czech Republic': 'Europe',
      'Hungary': 'Europe', 'Romania': 'Europe', 'Bulgaria': 'Europe',
      'Croatia': 'Europe', 'Russia': 'Europe', 'Ukraine': 'Europe',
      'United States': 'North America', 'United States of America': 'North America',
      'Canada': 'North America', 'Mexico': 'North America',
      'Brazil': 'South America', 'Argentina': 'South America',
      'Chile': 'South America', 'Colombia': 'South America',
      'Peru': 'South America', 'Venezuela': 'South America',
      'China': 'Asia', 'India': 'Asia', 'Japan': 'Asia',
      'South Korea': 'Asia', 'Singapore': 'Asia', 'Malaysia': 'Asia',
      'Indonesia': 'Asia', 'Thailand': 'Asia', 'Vietnam': 'Asia',
      'Philippines': 'Asia', 'Saudi Arabia': 'Asia',
      'United Arab Emirates': 'Asia', 'Israel': 'Asia', 'Turkey': 'Asia',
      'Australia': 'Oceania', 'New Zealand': 'Oceania', 'Fiji': 'Oceania',
    };
    return map[country] || 'Other';
  }

  // ✅ Choose which map component to use
  const MapComponent = VisitorOriginExplorer || VisitorOriginMap || (() => null);
  const useExplorer = !!VisitorOriginExplorer;

  console.log(`📊 Using ${useExplorer ? 'VisitorOriginExplorer' : 'VisitorOriginMap'} component`);

  // Get the display name for the current tier
  const tierDisplayNames: Record<string, string> = {
    'starter': 'Starter',
    'growth': 'Growth',
    'pro': 'Pro',
    'business': 'Business'
  };

  const tierColors: Record<string, string> = {
    'starter': 'bg-green-100 text-green-700',
    'growth': 'bg-blue-100 text-blue-700',
    'pro': 'bg-purple-100 text-purple-700',
    'business': 'bg-amber-100 text-amber-700'
  };

  return (
    <div className="space-y-6">
      {/* ✅ Plan Tier Indicator */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-stone-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics & Reports</h2>
          <p className="text-sm text-gray-500">Understand your guest demographics and booking patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Current Plan:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${tierColors[tier] || 'bg-gray-100 text-gray-700'}`}>
            {tierDisplayNames[tier] || tier}
          </span>
          {(tier === 'starter' || tier === 'growth') && (
            <button 
              onClick={() => window.location.href = '/business/billing'}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors flex items-center gap-1"
            >
              Upgrade →
              <span className="text-[10px] text-stone-400 font-normal">
                {tier === 'starter' ? 'to unlock countries' : 'to unlock regions'}
              </span>
            </button>
          )}
          {tier === 'pro' && (
            <button 
              onClick={() => window.location.href = '/business/billing'}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors flex items-center gap-1"
            >
              Upgrade to Business →
              <span className="text-[10px] text-stone-400 font-normal">for city-level insights</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Guests</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.totalGuests.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Check-ins</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.totalBookings.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Occupancy</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.occupancyRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Stay</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.averageStay.toFixed(1)} nights</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Revenue</p>
          <p className="text-xl font-bold text-gray-900">R{analyticsData.summary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Countries</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.uniqueCountries}</p>
        </div>
      </div>

      {/* 🌍 Map Component - Uses new explorer if available, otherwise falls back to old map */}
      <MapComponent
        data={useExplorer ? explorerData : mapData}
        drillLevel={drillLevel}
        limits={limits}
        onDrillDown={handleDrillDown}
        onDrillUp={handleDrillUp}
        canDrillDeeper={canDrillDeeper}
        getUpgradeMessage={getUpgradeMessage}
        isLoading={isLoading || (props.bookings || []).length === 0}
      />

      {/* 📊 Supporting Analytics - Guest Origins & Referral Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {limits.canViewCountries ? (
          <GuestOriginsChart
            bookings={props.bookings || []}
            chartType={props.guestChartType}
            onChartTypeChange={props.onGuestChartTypeChange}
          />
        ) : (
          <UpgradePreview
            title="Guest Origins by Country"
            description="Discover which countries your guests are coming from to target your marketing efforts."
            upgradeTo="Growth"
            icon={
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
          />
        )}

        {limits.canViewCountries ? (
          <ReferralSourcesChart
            bookings={props.bookings || []}
            chartType={props.referralChartType}
            onChartTypeChange={props.onReferralChartTypeChange}
          />
        ) : (
          <UpgradePreview
            title="How Guests Found You"
            description="Understand your marketing channels and where your bookings are coming from."
            upgradeTo="Growth"
            icon={
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            }
          />
        )}
      </div>

      {/* 🧳 Travel Patterns - Requires Pro or Higher */}
      {limits.canViewTravelPatterns ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TravelPatternsCard
            arrivingFrom={analyticsData.arrivingFrom}
            goingTo={analyticsData.goingTo}
            isLoading={(props.bookings || []).length === 0}
            title="Guest Travel Patterns"
          />
          <LengthOfStayChart bookings={props.bookings || []} />
        </div>
      ) : (
        <UpgradePreview
          title="Guest Travel Patterns"
          description="Discover where guests stay before arriving and where they travel to after departure."
          upgradeTo="Pro"
          icon={
            <div className="w-12 h-12 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          }
        />
      )}
    </div>
  );
}
