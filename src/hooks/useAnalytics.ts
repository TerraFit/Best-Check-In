// src/hooks/useAnalytics.ts
import { useState, useEffect, useCallback } from 'react';
import { analyticsService, AnalyticsSummary, AnalyticsFilters } from '../services/analyticsService';
import { getBusinessId } from '../utils/auth';

export function useAnalytics(totalRooms: number = 1) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({});

  const loadAnalytics = useCallback(async () => {
    const businessId = getBusinessId();
    if (!businessId) {
      setError('No business ID found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      analyticsService.setBusinessContext(businessId, totalRooms);
      const result = await analyticsService.getAnalytics(filters);
      setAnalytics(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, totalRooms]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    loading,
    error,
    filters,
    setFilters,
    refresh: loadAnalytics
  };
}
