// src/hooks/useAnalytics.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnalyticsData, AnalyticsFilters, DrillLevel, SubscriptionLimits, SUBSCRIPTION_LIMITS } from '../types/analytics';
import { analyticsService } from '../services/analyticsService';

export function useAnalytics(bookings: any[], subscriptionTier: string = 'starter') {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: '30days',
    startDate: '',
    endDate: ''
  });
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('world');
  const [drillPath, setDrillPath] = useState<string[]>([]);

  // Get subscription limits
  const limits = useMemo(() => {
    return SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS] || SUBSCRIPTION_LIMITS.starter;
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

  return {
    analyticsData,
    filters,
    setFilters,
    drillLevel,
    setDrillLevel,
    drillPath,
    setDrillPath,
    limits,
    canDrillDeeper,
    getUpgradeMessage,
    isLoading: filteredBookings.length === 0
  };
}
