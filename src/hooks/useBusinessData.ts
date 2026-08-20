// src/hooks/useBusinessData.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

interface Booking {
  id?: string; guest_name?: string; guest_email?: string; guest_phone?: string; guest_country?: string;
  guest_province?: string; guest_city?: string; guest_id_number?: string; check_in_date?: string;
  check_out_date?: string; nights?: number; total_amount?: number; booking_source?: string;
  referral_source?: string; status?: string; business_id?: string; arriving_from?: string; next_destination?: string;
}

export function useBusinessData(activeTab: string, currentPage: number, pageSize: number, currentFilters: any) {
  const { fetchWithAuth, getBusinessId } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [businessLoadError, setBusinessLoadError] = useState(false);
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
  const lastFiltersRef = useRef('');
  const loadingBusinessRef = useRef(false);
  const loadingBookingsRef = useRef(false);

  useEffect(() => () => {
    isMountedRef.current = false;
    abortControllerRef.current?.abort();
  }, []);

  const loadBusinessProfile = useCallback(async (force = false): Promise<any | null> => {
    if (loadingBusinessRef.current && !force) return business;
    if (initialLoadDoneRef.current && !force) return business;

    const businessId = getBusinessId();
    if (!businessId) {
      if (isMountedRef.current) {
        setBusiness(null); setBusinessLoadError(true); setLoading(false); initialLoadDoneRef.current = true;
      }
      return null;
    }

    loadingBusinessRef.current = true;
    try {
      console.log('📡 Loading business profile...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const cacheBust = `&_=${Date.now()}`;
      const res = await fetchWithAuth(`/.netlify/functions/get-business-branding?id=${encodeURIComponent(businessId)}${cacheBust}`, {
        signal: controller.signal, cache: 'no-store'
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const businessData = data.success && data.data ? data.data : data;
      if (!businessData || businessData.id !== businessId) throw new Error('Fresh business profile was not returned');

      if (isMountedRef.current) {
        setBusiness(businessData);
        setBusinessLoadError(false);
        console.log('✅ Business profile loaded:', businessData?.trading_name);
      }
      return businessData;
    } catch (err: any) {
      if (err.name === 'AbortError') console.warn('⚠️ Business branding request timed out');
      else console.error('❌ Failed to load business profile:', err);
      if (isMountedRef.current && !business) { setBusiness(null); setBusinessLoadError(true); }
      return null;
    } finally {
      if (isMountedRef.current) { setLoading(false); initialLoadDoneRef.current = true; }
      loadingBusinessRef.current = false;
    }
  }, [fetchWithAuth, getBusinessId, business]);

  useEffect(() => { void loadBusinessProfile(); }, [loadBusinessProfile]);

  const loadBookings = useCallback(async () => {
    const businessId = getBusinessId();
    if (!businessId || !business || loadingBookingsRef.current || refreshing) return;
    const filtersKey = JSON.stringify({ activeTab, currentPage, pageSize, dateRange: currentFilters?.dateRange, startDate: currentFilters?.startDate, endDate: currentFilters?.endDate, searchTerm: currentFilters?.searchTerm, statusFilter: currentFilters?.statusFilter, provinceFilter: currentFilters?.provinceFilter, cityFilter: currentFilters?.cityFilter, countryFilter: currentFilters?.countryFilter });
    if (lastFiltersRef.current === filtersKey) return;
    lastFiltersRef.current = filtersKey;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadingBookingsRef.current = true; setRefreshing(true);
    try {
      let url = `/.netlify/functions/get-business-bookings?businessId=${encodeURIComponent(businessId)}`;
      url += activeTab === 'reports' ? '&limit=10000&page=1' : `&limit=${pageSize}&page=${currentPage}`;
      url += '&includeFacets=true';
      if (activeTab === 'reports' || activeTab === 'checkins') {
        if (currentFilters?.startDate && currentFilters?.endDate) url += `&startDate=${encodeURIComponent(currentFilters.startDate)}&endDate=${encodeURIComponent(currentFilters.endDate)}`;
        else if (currentFilters?.dateRange && currentFilters.dateRange !== 'all') { const days: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90, '12months': 365 }; if (days[currentFilters.dateRange]) { const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days[currentFilters.dateRange]); url += `&startDate=${cutoff.toISOString().split('T')[0]}`; } }
        if (currentFilters?.statusFilter) url += `&status=${encodeURIComponent(currentFilters.statusFilter)}`;
        if (currentFilters?.provinceFilter) url += `&province=${encodeURIComponent(currentFilters.provinceFilter)}`;
        if (currentFilters?.cityFilter) url += `&city=${encodeURIComponent(currentFilters.cityFilter)}`;
        if (currentFilters?.countryFilter) url += `&country=${encodeURIComponent(currentFilters.countryFilter)}`;
        if (currentFilters?.searchTerm) url += `&search=${encodeURIComponent(currentFilters.searchTerm)}`;
      }
      console.log('🔗 Fetching bookings:', url);
      const res = await fetchWithAuth(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json(); if (!isMountedRef.current) return;
      const rawBookings: Booking[] = Array.isArray(result.bookings) ? result.bookings : result.success && Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
      const validBookings = rawBookings.filter(b => b.business_id === businessId); setBookings(validBookings);
      const total = result.total_count ?? validBookings.length; setTotalBookingsCount(total); setTotalPages(activeTab === 'reports' ? 1 : Math.max(1, result.total_pages ?? Math.ceil(total / pageSize)));
      if (result.facets) { setUniqueProvinces(Array.isArray(result.facets.provinces) ? result.facets.provinces : []); setUniqueCities(Array.isArray(result.facets.cities) ? result.facets.cities : []); setUniqueCountries(Array.isArray(result.facets.countries) ? result.facets.countries : []); }
      else { setUniqueProvinces([...new Set(validBookings.map(b => b.guest_province).filter(Boolean))].sort() as string[]); setUniqueCities([...new Set(validBookings.map(b => b.guest_city).filter(Boolean))].sort() as string[]); setUniqueCountries([...new Set(validBookings.map(b => b.guest_country?.replace(/\.$/, '').trim()).filter(Boolean))].sort() as string[]); }
      const todayStr = new Date().toISOString().split('T')[0]; const today = new Date(); today.setHours(0,0,0,0);
      setTodayArrivals(validBookings.filter(b => b.check_in_date === todayStr)); setTodayCheckouts(validBookings.filter(b => b.check_out_date === todayStr)); setTodayStayovers(validBookings.filter(b => { if (!b.check_in_date) return false; const checkIn = new Date(b.check_in_date); checkIn.setHours(0,0,0,0); if (checkIn >= today) return false; if (!b.check_out_date) return true; const checkOut = new Date(b.check_out_date); checkOut.setHours(0,0,0,0); return checkOut > today; }));
      console.log(`📦 Loaded ${validBookings.length} bookings (filtered total: ${total})`);
    } catch (err: any) { if (err.name !== 'AbortError' && isMountedRef.current) console.error('❌ Error loading bookings:', err); }
    finally { if (isMountedRef.current) setRefreshing(false); loadingBookingsRef.current = false; abortControllerRef.current = null; }
  }, [activeTab, currentPage, pageSize, currentFilters, fetchWithAuth, getBusinessId, refreshing, business]);

  useEffect(() => { if (business && initialLoadDoneRef.current) void loadBookings(); }, [business, activeTab, currentPage, pageSize, currentFilters?.dateRange, currentFilters?.startDate, currentFilters?.endDate, currentFilters?.statusFilter, currentFilters?.provinceFilter, currentFilters?.cityFilter, currentFilters?.countryFilter, currentFilters?.searchTerm, loadBookings]);

  const refreshData = useCallback(async (): Promise<any | null> => {
    lastFiltersRef.current = '';
    const freshBusiness = await loadBusinessProfile(true);
    if (freshBusiness && isMountedRef.current) {
      // Do not depend on React state having committed yet. The caller receives the exact database response.
      await Promise.resolve();
      void loadBookings();
    }
    return freshBusiness;
  }, [loadBusinessProfile, loadBookings]);

  return { business, businessLoadError, bookings, loading, refreshing, totalBookingsCount, totalPages, todayArrivals, todayStayovers, todayCheckouts, uniqueProvinces, uniqueCities, uniqueCountries, refreshData };
}
