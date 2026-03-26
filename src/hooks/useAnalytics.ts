import { useState, useEffect, useCallback } from 'react';
import { getBusinessId, getAuth } from './auth';

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  country?: string;
  province?: string;
  city?: string;
}

export interface AnalyticsData {
  total_bookings: number;
  total_revenue: number;
  booking_density: number;
  today_bookings: number;
  monthly_data: {
    month: string;
    year: number;
    bookings: number;
    revenue: number;
    density: number;
    monthIndex: number;
  }[];
  guest_origins: {
    provinces: Record<string, number>;
    cities: Record<string, number>;
    countries: Record<string, number>;
  };
  recent_checkins: any[];
}

export const useAnalytics = (totalRooms?: number) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (filters?: AnalyticsFilters) => {
    console.log('🔍 loadAnalytics called');
    
    const businessId = getBusinessId();
    console.log('🔍 Business ID:', businessId);
    
    if (!businessId) {
      console.error('No business ID found');
      setError('No business ID found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let url = `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=500`;
      if (filters?.dateFrom) url += `&startDate=${filters.dateFrom}`;
      if (filters?.dateTo) url += `&endDate=${filters.dateTo}`;
      
      console.log('🔍 Fetching URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      console.log('📡 API Response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }
      
      if (!Array.isArray(data?.bookings)) {
        throw new Error('Invalid data structure from server');
      }
      
      let bookings = data.bookings;
      console.log('📊 Raw bookings count:', bookings.length);
      
      // Apply filters
      if (filters?.country) {
        bookings = bookings.filter((b: any) => b.guest_country === filters.country);
      }
      if (filters?.province) {
        bookings = bookings.filter((b: any) => b.guest_province === filters.province);
      }
      if (filters?.city) {
        bookings = bookings.filter((b: any) => b.guest_city === filters.city);
      }
      
      const today = new Date().toISOString().split('T')[0];
      const totalRevenue = bookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
      const totalNights = bookings.reduce((sum: number, b: any) => sum + (b.nights || 1), 0);
      const todayBookings = bookings.filter((b: any) => b.check_in_date === today).length;
      
      const rooms = totalRooms || 1;
      const dates = bookings.map((b: any) => new Date(b.check_in_date).getTime());
      const min = Math.min(...dates);
      const max = Math.max(...dates);
      const days = dates.length ? (max - min) / (1000 * 60 * 60 * 24) + 1 : 1;
      const maxNights = rooms * days;
      const booking_density = maxNights ? Math.min(100, Math.round((totalNights / maxNights) * 100)) : 0;
      
      // Monthly grouping
      const monthlyMap: Record<string, any> = {};
      bookings.forEach((b: any) => {
        const d = new Date(b.check_in_date);
        const monthIndex = d.getMonth();
        const year = d.getFullYear();
        const key = `${year}-${monthIndex}`;
        
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            month: d.toLocaleString('default', { month: 'short' }),
            monthIndex,
            year,
            bookings: 0,
            revenue: 0,
            nights: 0,
          };
        }
        
        monthlyMap[key].bookings++;
        monthlyMap[key].revenue += b.total_amount || 0;
        monthlyMap[key].nights += b.nights || 1;
      });
      
      const monthly_data = Object.values(monthlyMap)
        .map((m: any) => {
          const daysInMonth = new Date(m.year, m.monthIndex + 1, 0).getDate();
          const max = rooms * daysInMonth;
          return {
            ...m,
            density: max ? Math.round((m.nights / max) * 100) : 0,
          };
        })
        .sort((a: any, b: any) => a.year - b.year || a.monthIndex - b.monthIndex);
      
      // Guest origins
      const guest_origins = {
        countries: {} as Record<string, number>,
        provinces: {} as Record<string, number>,
        cities: {} as Record<string, number>,
      };
      
      bookings.forEach((b: any) => {
        if (b.guest_country) guest_origins.countries[b.guest_country] = (guest_origins.countries[b.guest_country] || 0) + 1;
        if (b.guest_province) guest_origins.provinces[b.guest_province] = (guest_origins.provinces[b.guest_province] || 0) + 1;
        if (b.guest_city) guest_origins.cities[b.guest_city] = (guest_origins.cities[b.guest_city] || 0) + 1;
      });
      
      setAnalytics({
        total_bookings: bookings.length,
        total_revenue: totalRevenue,
        booking_density,
        today_bookings: todayBookings,
        monthly_data,
        guest_origins,
        recent_checkins: bookings.slice(0, 10),
      });
      
      console.log('✅ Analytics loaded successfully');
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [totalRooms]);

  // Auto-retry if auth not ready
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    
    const tryLoad = () => {
      const businessId = getBusinessId();
      if (businessId) {
        loadAnalytics();
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`⏳ Auth not ready, retry ${retryCount}/${maxRetries}...`);
        setTimeout(tryLoad, 1000);
      } else {
        console.error('Failed to get business ID after multiple retries');
        setError('Authentication failed - please log in again');
      }
    };
    
    tryLoad();
  }, [loadAnalytics]);

  return { analytics, loading, error, refresh: loadAnalytics };
};
