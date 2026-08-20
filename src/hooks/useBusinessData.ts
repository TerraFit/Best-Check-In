// src/hooks/useBusinessData.ts
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
  const loadingBusinessRef = useRef(false); // ✅ Prevent duplicate loads

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
  // ✅ Load Business Profile - FIXED infinite loop
  // ============================================================
  useEffect(() => {
    // ✅ Prevent multiple simultaneous loads
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
        
        // ✅ Add timeout
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
  }, [fetchWithAuth, getBusinessId]); // ✅ Only depend on stable values

  // ============================================================
  // ✅ Load Bookings - FIXED dependencies
  // ============================================================
  const loadBookings = useCallback(async () => {
    const businessId = getBusinessId();
    if (!businessId || !business) {
      return;
    }

    if (refreshing) {
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
      let url = `/.netlify/functions/get-business-bookings?businessId=${businessId}`;

      if (activeTab === 'reports') {
        url += `&limit=10000&page=1`;
      } else {
        url += `&limit=${pageSize}&page=${currentPage}`;
      }

      // Always request facets so dropdowns reflect business population (date-scoped).
      url += `&includeFacets=true`;

      if (activeTab === 'reports' || activeTab === 'checkins') {
        if (currentFilters?.startDate && currentFilters?.endDate) {
          url += `&startDate=${encodeURIComponent(currentFilters.startDate)}&endDate=${encodeURIComponent(currentFilters.endDate)}`;
        } else if (currentFilters?.dateRange && currentFilters.dateRange !== 'all') {
          const days: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90, '12months': 365 };
          if (days[currentFilters.dateRange]) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days[currentFilters.dateRange]);
            url += `&startDate=${cutoffDate.toISOString().split('T')[0]}`;
          }
        }

        // Server-side filters (applied BEFORE pagination)
        if (currentFilters?.statusFilter) {
          url += `&status=${encodeURIComponent(currentFilters.statusFilter)}`;
        }
        if (currentFilters?.provinceFilter) {
          url += `&province=${encodeURIComponent(currentFilters.provinceFilter)}`;
        }
        if (currentFilters?.cityFilter) {
          url += `&city=${encodeURIComponent(currentFilters.cityFilter)}`;
        }
        if (currentFilters?.countryFilter) {
          url += `&country=${encodeURIComponent(currentFilters.countryFilter)}`;
        }
        if (currentFilters?.searchTerm) {
          url += `&search=${encodeURIComponent(currentFilters.searchTerm)}`;
        }
      }

      console.log('🔗 Fetching bookings:', url);
      const res = await fetchWithAuth(url, { signal: controller.signal });
      const result = await res.json();

      if (!isMountedRef.current) return;

      let rawBookings: Booking[] = [];
      if (result.bookings && Array.isArray(result.bookings)) {
        rawBookings = result.bookings;
      } else if (result.success && Array.isArray(result.data)) {
        rawBookings = result.data;
      } else if (Array.isArray(result)) {
        rawBookings = result;
      }

      const validBookings = rawBookings.filter((b) => b.business_id === businessId);
      setBookings(validBookings);

      if (activeTab !== 'reports') {
        setTotalBookingsCount(result.total_count ?? validBookings.length);
        const calculatedTotalPages =
          result.total_pages ??
          Math.ceil((result.total_count ?? validBookings.length) / pageSize);
        setTotalPages(Math.max(1, calculatedTotalPages));
      } else {
        setTotalBookingsCount(validBookings.length);
        setTotalPages(1);
      }

      // Prefer server facets (full population). Fallback to page-derived only if missing.
      if (result.facets) {
        setUniqueProvinces(Array.isArray(result.facets.provinces) ? result.facets.provinces : []);
        setUniqueCities(Array.isArray(result.facets.cities) ? result.facets.cities : []);
        setUniqueCountries(Array.isArray(result.facets.countries) ? result.facets.countries : []);
      } else {
        const provinces = [
          ...new Set(validBookings.map((b) => b.guest_province).filter(Boolean))
        ] as string[];
        const cities = [
          ...new Set(validBookings.map((b) => b.guest_city).filter(Boolean))
        ] as string[];
        const countries = [
          ...new Set(
            validBookings
              .map((b) => b.guest_country?.replace(/\.$/, '').trim())
              .filter(Boolean)
          )
        ] as string[];
        setUniqueProvinces(provinces.sort());
        setUniqueCities(cities.sort());
        setUniqueCountries(countries.sort());
      }

      // Today's Activity Calculations (from current page — overview cards may be approximate under filters)
      const todayStr = new Date().toISOString().split('T')[0];
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      const arrivals = validBookings.filter((b) => b.check_in_date === todayStr);
      const checkouts = validBookings.filter((b) => b.check_out_date === todayStr);

      const stayovers = validBookings.filter((b) => {
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

      console.log(`📦 Loaded ${validBookings.length} bookings (filtered total: ${result.total_count ?? '?'})`);
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

  // Trigger bookings load when business is ready or filters/pagination change
  useEffect(() => {
    if (business && initialLoadDoneRef.current) {
      loadBookings();
    }
  }, [
    business,
    currentPage,
    pageSize,
    activeTab,
    currentFilters?.dateRange,
    currentFilters?.startDate,
    currentFilters?.endDate,
    currentFilters?.statusFilter,
    currentFilters?.provinceFilter,
    currentFilters?.cityFilter,
    currentFilters?.countryFilter,
    currentFilters?.searchTerm,
    loadBookings
  ]);

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
