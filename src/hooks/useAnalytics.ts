// src/hooks/useAnalytics.ts
import { useState, useMemo, useCallback } from 'react';
import { AnalyticsFilters, DrillLevel, SUBSCRIPTION_LIMITS } from '../types/analytics';
import { analyticsService } from '../services/analyticsService';

export function useAnalytics(bookings: any[], subscriptionTier: string = 'starter') {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: '30days',
    startDate: '',
    endDate: ''
  });
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('world');
  const [drillPath, setDrillPath] = useState<string[]>([]);

  // ✅ FIX: Map subscription tier to valid plan names
  const getValidTier = (tier: string): 'starter' | 'growth' | 'pro' | 'business' => {
    // If tier is already a valid plan name, use it
    const validPlans = ['starter', 'growth', 'pro', 'business'];
    const normalizedTier = tier?.toLowerCase() || 'starter';
    
    if (validPlans.includes(normalizedTier)) {
      return normalizedTier as 'starter' | 'growth' | 'pro' | 'business';
    }
    
    // Map billing cycles to plans (temporary - business should set plan separately)
    const tierMap: Record<string, 'starter' | 'growth' | 'pro' | 'business'> = {
      'monthly': 'starter',
      'annual': 'starter',
      'trial': 'starter',
      'complimentary': 'starter',
      'free': 'starter',
      'standard': 'starter',
      'premium': 'growth',
    };
    
    return tierMap[normalizedTier] || 'starter';
  };

  // Get subscription limits with proper tier mapping
  const limits = useMemo(() => {
    const validTier = getValidTier(subscriptionTier);
    console.log('📊 useAnalytics - subscriptionTier:', subscriptionTier, '→ mapped to:', validTier);
    
    return SUBSCRIPTION_LIMITS[validTier] || SUBSCRIPTION_LIMITS.starter;
  }, [subscriptionTier]);

  // Filter bookings by date range
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    if (filters.dateRange && filters.dateRange !== 'all') {
      const days: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90, '12months': 365 };
      if (days[filters.dateRange]) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days[filters.dateRange]);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        filtered = filtered.filter(b => b.check_in_date >= cutoffStr);
      }
    }

    if (filters.startDate) {
      filtered = filtered.filter(b => b.check_in_date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(b => b.check_in_date <= filters.endDate);
    }

    return filtered;
  }, [bookings, filters]);

  // Compute analytics data
  const analyticsData = useMemo(() => {
    analyticsService.setBookings(filteredBookings);
    const data = analyticsService.getFullAnalytics(drillLevel);
    
    // Apply subscription-based filtering
    if (!limits.canViewCountries) {
      data.originData = data.originData.map(continent => ({
        ...continent,
        children: undefined
      }));
    }

    if (!limits.canViewTravelPatterns) {
      data.arrivingFrom = [];
      data.goingTo = [];
    }

    return data;
  }, [filteredBookings, drillLevel, limits]);

  // Check if user can drill deeper
  const canDrillDeeper = useCallback((level: DrillLevel): boolean => {
    const levelOrder: Record<DrillLevel, number> = {
      'world': 0,
      'continent': 1,
      'country': 2,
      'region': 3,
      'city': 4
    };
    return levelOrder[level] <= levelOrder[limits.maxDrillLevel];
  }, [limits]);

  // Get upgrade message for locked features
  const getUpgradeMessage = useCallback((feature: string): string => {
    const messages: Record<string, string> = {
      'countries': 'Upgrade to Growth or higher to see country-level breakdowns',
      'regions': 'Upgrade to Pro or higher to see regional analytics',
      'cities': 'Upgrade to Business or higher to see city-level insights',
      'travelPatterns': 'Upgrade to Pro or higher to track guest travel patterns'
    };
    return messages[feature] || 'Upgrade to unlock this feature';
  }, []);

  // ✅ FIX: Include the actual tier in limits for display
  const limitsWithTier = useMemo(() => ({
    ...limits,
    subscriptionTier: getValidTier(subscriptionTier),
    rawSubscriptionTier: subscriptionTier, // Keep original for debugging
  }), [limits, subscriptionTier]);

  return {
    analyticsData,
    filters,
    setFilters,
    drillLevel,
    setDrillLevel,
    drillPath,
    setDrillPath,
    limits: limitsWithTier, // ← Return enhanced limits
    canDrillDeeper,
    getUpgradeMessage,
    isLoading: filteredBookings.length === 0
  };
}
