// src/hooks/useBusinessData.ts
// ✅ PHASE 1: Minimal version - no status filter, no double filter, full debug logging

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

interface Booking {
  id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  guest_id_number?: string;
  check_in_date?: string;
  check_out_date?: string;
  nights?: number;
  total_amount?: number;
  booking_source?: string;
  referral_source?: string;
  status?: string;
  business_id?: string;
  arriving_from?: string;
  next_destination?: string;
  room_id?: string;
  room_number?: string;
  room_name?: string;
}

export function useBusinessData(activeTab: string, currentPage: number, pageSize: number, currentFilters: any) {
  const { fetchWithAuth, getBusinessId } = useAuth();
  
  const [business, setBusiness] = useState<any>(null);
  const [businessLoadError, setBusinessLoadError] = useState<boolean>(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [todayArrivals, setTodayArrivals] = useState<Booking[]>([]);
  const [todayStayovers, setTodayStayovers] = useState<Booking[]>([]);
  const [todayCheckouts, setTodayCheckouts] = useState<Booking[]>([]);
  
  const [uniqueProvinces, setUniqueProvinces] = useState<string[]>([]);
  const [uniqueCities, setUniqueCities] = useState<string[]>([]);
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);
  const lastFiltersRef = useRef<string>('');
  const loadingBusinessRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================================
  // ✅ Load Business Profile
  // ============================================================
  useEffect(() => {
    if (loadingBusinessRef.current) return;
    if (initialLoadDoneRef.current) return;

    const loadBusinessProfile = async () => {
      const businessId = getBusinessId();
      if (!businessId) {
        if (isMountedRef.current) {
          setLoading(false);
          setBusinessLoadError(true);
          initialLoadDoneRef.current = true;
        }
        return;
      }

      loadingBusinessRef.current = true;

      try {
        console.log('📡 Loading business profile...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn('⚠️ Business branding request timed out');
          controller.abort();
        }, 8000);

        const res = await fetchWithAuth(
          `/.netlify/functions/get-business-branding?id=${businessId}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        if (!res.ok) {
          if (res.status === 404) {
            console.warn('⚠️ Business not found');
            if (isMountedRef.current) {
              setBusiness(null);
              setBusinessLoadError(true);
            }
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        const businessData = data.success && data.data ? data.data : data.id ? data : data;
        
        if (isMountedRef.current) {
          setBusiness(businessData);
          setBusinessLoadError(false);
          console.log('✅ Business profile loaded:', businessData?.trading_name);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn('⚠️ Business branding request timed out');
          if (isMountedRef.current) {
            setBusiness(null);
            setBusinessLoadError(true);
          }
        } else {
          console.error('❌ Failed to load business profile:', err);
          if (isMountedRef.current) {
            setBusiness(null);
            setBusinessLoadError(true);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          initialLoadDoneRef.current = true;
        }
        loadingBusinessRef.current = false;
      }
    };

    loadBusinessProfile();
  }, [fetchWithAuth, getBusinessId]);

  // ============================================================
  // ✅ Load Bookings - PHASE 1: NO status filter, NO double filter
  // ============================================================
  const loadBookings = useCallback(async () => {
    const businessId = getBusinessId();
    if (!businessId || !business) {
      console.log('⏭️ Skipping bookings load - no business');
      return;
    }

    if (refreshing) {
      console.log('⏭️ Skipping bookings load - already refreshing');
      return;
    }

    // Create a unique key for current filters
    const filtersKey = JSON.stringify({
      activeTab,
      currentPage,
      pageSize,
      dateRange: currentFilters?.dateRange,
      startDate: currentFilters?.startDate,
      endDate: currentFilters?.endDate,
      searchTerm: currentFilters?.searchTerm,
      statusFilter: currentFilters?.statusFilter,
      provinceFilter: currentFilters?.provinceFilter,
      cityFilter: currentFilters?.cityFilter,
      countryFilter: currentFilters?.countryFilter
    });

    // Skip if same filters
    if (lastFiltersRef.current === filtersKey) {
      console.log('⏭️ Skipping bookings load - same filters');
      return;
    }
    lastFiltersRef.current = filtersKey;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setRefreshing(true);

    try {
      // ✅ PHASE 1: NO status filter - just businessId
      let url = `/.netlify/functions/get-business-bookings?businessId=${businessId}`;
      
      if (activeTab === 'reports') {
        url += `&limit=10000&page=1`;
      } else {
        url += `&limit=${pageSize}&page=${currentPage}`;
      }
      
      // ✅ Date filters only (if needed)
      if (activeTab === 'reports' || activeTab === 'checkins') {
        if (currentFilters?.startDate && currentFilters?.endDate) {
          url += `&startDate=${currentFilters.startDate}&endDate=${currentFilters.endDate}`;
        } else if (currentFilters?.dateRange && currentFilters.dateRange !== 'all') {
          const days: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90, '12months': 365 };
          if (days[currentFilters.dateRange]) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days[currentFilters.dateRange]);
            url += `&startDate=${cutoffDate.toISOString().split('T')[0]}`;
          }
        }
      }
      
      console.log('🔗 Fetching bookings (no status filter):', url);
      const res = await fetchWithAuth(url, { signal: controller.signal });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const result = await res.json();
      
      // ✅ PHASE 1: Log the full response shape
      console.log('📡 API Response keys:', Object.keys(result));
      console.log('📡 Bookings length:', result.bookings?.length);
      console.log('📡 Total count:', result.total_count);
      console.log('📡 Success:', result.success);
      
      if (!isMountedRef.current) return;
      
      // ✅ Parse the response
      let validBookings: Booking[] = [];
      
      if (result.success && result.bookings && Array.isArray(result.bookings)) {
        validBookings = result.bookings;
        console.log(`✅ Found ${validBookings.length} bookings in response`);
      } else if (result.bookings && Array.isArray(result.bookings)) {
        validBookings = result.bookings;
      } else {
        console.warn('⚠️ Unexpected response format:', Object.keys(result));
        validBookings = [];
      }
      
      // ✅ PHASE 1: NO business_id filter - use raw data
      const filteredBookings = validBookings;
      
      // ✅ PHASE 1: Debug business ID comparison
      console.log('🔍 Auth Business ID:', businessId);
      const bizIds = [...new Set(validBookings.map(b => b.business_id))];
      console.log('📋 Business IDs in bookings:', bizIds);
      
      if (validBookings.length > 0 && bizIds.length > 0) {
        console.log('✅ Match?', bizIds[0] === businessId);
      }
      
      console.log(`✅ Setting ${filteredBookings.length} bookings`);
      setBookings(filteredBookings);
      
      // ✅ Use total_count from API or fallback to length
      const totalCount = result.total_count || filteredBookings.length;
      setTotalBookingsCount(totalCount);
      
      const calculatedTotalPages = result.total_pages || Math.ceil(totalCount / pageSize);
      setTotalPages(calculatedTotalPages);
      
      // ✅ Extract unique locations
      const provinces = [...new Set(filteredBookings.map(b => b.guest_province).filter(Boolean))];
      const cities = [...new Set(filteredBookings.map(b => b.guest_city).filter(Boolean))];
      const countries = [...new Set(filteredBookings.map(b => b.guest_country?.replace(/\.$/, '').trim()).filter(Boolean))];
      
      setUniqueProvinces(provinces.sort());
      setUniqueCities(cities.sort());
      setUniqueCountries(countries.sort());
      
      // ✅ Today's Activity Calculations
      const todayStr = new Date().toISOString().split('T')[0];
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const arrivals = filteredBookings.filter(b => b.check_in_date === todayStr);
      const checkouts = filteredBookings.filter(b => b.check_out_date === todayStr);
      
      const stayovers = filteredBookings.filter(b => {
        if (!b.check_in_date) return false;
        
        const checkInDate = new Date(b.check_in_date);
        checkInDate.setHours(0, 0, 0, 0);
        
        if (checkInDate.getTime() >= todayDate.getTime()) return false;
        if (!b.check_out_date) return true;
        
        const checkOutDate = new Date(b.check_out_date);
        checkOutDate.setHours(0, 0, 0, 0);
        return checkOutDate > todayDate;
      });
      
      setTodayArrivals(arrivals);
      setTodayStayovers(stayovers);
      setTodayCheckouts(checkouts);
      
      console.log(`📦 Loaded ${filteredBookings.length} bookings`);
      console.log(`📊 Today: ${arrivals.length} arrivals, ${stayovers.length} stayovers, ${checkouts.length} checkouts`);
      
    } catch (err: any) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('❌ Error loading bookings:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
      abortControllerRef.current = null;
    }
  }, [activeTab, currentPage, pageSize, currentFilters, fetchWithAuth, getBusinessId, refreshing, business]);

  // ✅ Trigger bookings load ONLY when business is loaded
  useEffect(() => {
    if (business && initialLoadDoneRef.current) {
      loadBookings();
    }
  }, [business, currentPage, pageSize, activeTab, currentFilters?.dateRange, currentFilters?.startDate, currentFilters?.endDate, loadBookings]);

  const refreshData = useCallback(() => {
    if (business) {
      lastFiltersRef.current = '';
      loadBookings();
    }
  }, [loadBookings, business]);

  return {
    business,
    businessLoadError,
    bookings,
    loading,
    refreshing,
    totalBookingsCount,
    totalPages,
    todayArrivals,
    todayStayovers,
    todayCheckouts,
    uniqueProvinces,
    uniqueCities,
    uniqueCountries,
    refreshData
  };
}
