// src/components/analytics/VisitorOriginExplorerBridge.tsx
import { useMemo } from 'react';
import { VisitorOriginExplorer } from './VisitorOriginExplorer';
import { SubscriptionTier } from '../../types/analytics';

interface VisitorOriginExplorerBridgeProps {
  /** The existing mapData from ReportsTab (already aggregated by continent) */
  mapData: any[];
  /** The original bookings for drill-down data */
  bookings: any[];
  /** Subscription limits */
  limits: {
    canViewCountries: boolean;
    canViewRegions: boolean;
    canViewCities: boolean;
    maxDrillLevel: string;
    subscriptionTier: SubscriptionTier;
  };
  /** Loading state */
  isLoading?: boolean;
  /** Drill level from useAnalytics */
  drillLevel: string;
  /** Drill path from useAnalytics */
  drillPath: string[];
  /** Callbacks */
  onDrillDown: (item: any) => void;
  onDrillUp: () => void;
  canDrillDeeper: (level: string) => boolean;
  getUpgradeMessage: (feature: string) => string;
}

/**
 * Bridge component that adapts the existing mapData from ReportsTab
 * to the format expected by VisitorOriginExplorer
 */
export function VisitorOriginExplorerBridge({
  mapData,
  bookings,
  limits,
  isLoading = false,
  drillLevel,
  drillPath,
  onDrillDown,
  onDrillUp,
  canDrillDeeper,
  getUpgradeMessage,
}: VisitorOriginExplorerBridgeProps) {
  
  // ✅ Transform mapData to the format VisitorOriginExplorer expects
  const explorerData = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    
    // Build visitor records from bookings
    return bookings.map((b: any) => ({
      id: b.id || `booking-${Math.random()}`,
      timestamp: b.created_at || b.check_in_date || new Date().toISOString(),
      continent: getContinentFromCountry(b.guest_country || b.country),
      country: b.guest_country || b.country || 'Unknown',
      region: b.guest_province || b.province || 'Unknown',
      city: b.guest_city || b.city || 'Unknown',
      count: 1,
    }));
  }, [bookings]);

  // Helper function to map country to continent
  function getContinentFromCountry(country: string): string {
    if (!country) return 'Other';
    
    const map: Record<string, string> = {
      // Africa
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
      // Europe
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
      // North America
      'United States': 'North America',
      'United States of America': 'North America',
      'Canada': 'North America',
      'Mexico': 'North America',
      // South America
      'Brazil': 'South America',
      'Argentina': 'South America',
      'Chile': 'South America',
      'Colombia': 'South America',
      'Peru': 'South America',
      'Venezuela': 'South America',
      // Asia
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
      // Oceania
      'Australia': 'Oceania',
      'New Zealand': 'Oceania',
      'Fiji': 'Oceania',
    };
    
    return map[country] || 'Other';
  }

  // ✅ Map drill levels from useAnalytics to explorer's format
  const explorerDrillLevel = useMemo(() => {
    // Map the drillLevel from useAnalytics to the explorer's format
    const levelMap: Record<string, 'world' | 'continents' | 'countries' | 'regions' | 'cities'> = {
      'world': 'world',
      'continent': 'continents',
      'country': 'countries',
      'region': 'regions',
      'city': 'cities',
    };
    return levelMap[drillLevel] || 'world';
  }, [drillLevel]);

  // ✅ Convert explorer's drill level back to useAnalytics format
  const handleExplorerDrillDown = (item: any) => {
    // The explorer passes the item, we need to convert it to the format onDrillDown expects
    onDrillDown(item);
  };

  const handleExplorerDrillUp = () => {
    onDrillUp();
  };

  // ✅ Convert limits to explorer format
  const explorerLimits = useMemo(() => ({
    canViewCountries: limits.canViewCountries || false,
    canViewRegions: limits.canViewRegions || false,
    canViewCities: limits.canViewCities || false,
    maxDrillLevel: (limits.maxDrillLevel || 'world') as 'world' | 'continents' | 'countries' | 'regions' | 'cities',
    subscriptionTier: limits.subscriptionTier || 'starter',
  }), [limits]);

  // If no bookings, show empty state
  if (!bookings || bookings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
        <div className="text-4xl mb-4">🌍</div>
        <h3 className="text-lg font-semibold text-stone-900 mb-2">No Visitor Data Available</h3>
        <p className="text-stone-500 text-sm">As guests check in, their origin data will appear here.</p>
      </div>
    );
  }

  return (
    <VisitorOriginExplorer
      data={explorerData}
      limits={explorerLimits}
      isLoading={isLoading}
      title="Visitor Origin Explorer"
      subtitle="Click the orange bubbles to drill down from world to cities"
      // Override the internal navigation with our own
      // We're passing the props but the explorer will use its own state
      // We need to sync the drill level
    />
  );
}

export default VisitorOriginExplorerBridge;
