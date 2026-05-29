// src/hooks/useBusinessData.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './useAuth'

interface Booking {
  id?: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  guest_country?: string
  guest_province?: string
  guest_city?: string
  guest_id_number?: string
  check_in_date?: string
  check_out_date?: string
  nights?: number
  total_amount?: number
  booking_source?: string
  referral_source?: string
  status?: string
  business_id?: string
}

export function useBusinessData(activeTab: string, currentPage: number, pageSize: number, currentFilters: any) {
  const { fetchWithAuth, getBusinessId } = useAuth()
  
  const [business, setBusiness] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalBookingsCount, setTotalBookingsCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  
  const [todayArrivals, setTodayArrivals] = useState<Booking[]>([])
  const [todayStayovers, setTodayStayovers] = useState<Booking[]>([])
  const [todayCheckouts, setTodayCheckouts] = useState<Booking[]>([])
  
  const [uniqueProvinces, setUniqueProvinces] = useState<string[]>([])
  const [uniqueCities, setUniqueCities] = useState<string[]>([])
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([])
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  const businessLoadedRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Load Business Profile - runs only once
  useEffect(() => {
    const loadBusinessProfile = async () => {
      const businessId = getBusinessId()
      if (!businessId) {
        if (isMountedRef.current) {
          setLoading(false)
          setInitialLoading(false)
        }
        return
      }

      try {
        console.log('📡 Loading business profile...')
        const res = await fetchWithAuth(`/.netlify/functions/get-business-branding?id=${businessId}`)
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        
        const data = await res.json()
        const businessData = data.success && data.data ? data.data : data.id ? data : data
        
        if (isMountedRef.current) {
          setBusiness(businessData)
          console.log('✅ Business profile loaded:', businessData?.trading_name)
        }
      } catch (err) {
        console.error('❌ Failed to load business profile:', err)
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
          setInitialLoading(false)
          businessLoadedRef.current = true
        }
      }
    }

    // Only run once on mount
    loadBusinessProfile()
  }, []) // Empty dependency array - runs only once

  // Load Bookings - runs when dependencies change, but only if business exists
  const loadBookings = useCallback(async () => {
    const businessId = getBusinessId()
    if (!businessId || !business) {
      return
    }

    if (refreshing) {
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setRefreshing(true)

    try {
      let url = `/.netlify/functions/get-business-bookings?businessId=${businessId}`
      
      if (activeTab === 'reports') {
        url += `&limit=10000&page=1`
      } else {
        url += `&limit=${pageSize}&page=${currentPage}`
      }
      
      if (activeTab === 'reports' || activeTab === 'checkins') {
        if (currentFilters?.startDate && currentFilters?.endDate) {
          url += `&startDate=${currentFilters.startDate}&endDate=${currentFilters.endDate}`
        } else if (currentFilters?.dateRange && currentFilters.dateRange !== 'all') {
          const days: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90, '12months': 365 }
          if (days[currentFilters.dateRange]) {
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - days[currentFilters.dateRange])
            url += `&startDate=${cutoffDate.toISOString().split('T')[0]}`
          }
        }
      }
      
      console.log('🔗 Fetching bookings:', url)
      const res = await fetchWithAuth(url, { signal: controller.signal })
      const result = await res.json()
      
      if (!isMountedRef.current) return
      
      let rawBookings = []
      if (result.bookings && Array.isArray(result.bookings)) {
        rawBookings = result.bookings
      } else if (result.success && Array.isArray(result.data)) {
        rawBookings = result.data
      } else if (Array.isArray(result)) {
        rawBookings = result
      }
      
      const validBookings = rawBookings.filter(b => b.business_id === businessId)
      setBookings(validBookings)
      
      if (activeTab !== 'reports') {
        setTotalBookingsCount(result.total_count || validBookings.length)
        const calculatedTotalPages = result.total_pages || Math.ceil((result.total_count || validBookings.length) / pageSize)
        setTotalPages(calculatedTotalPages)
      } else {
        setTotalBookingsCount(validBookings.length)
        setTotalPages(1)
      }
      
      const provinces = [...new Set(validBookings.map(b => b.guest_province).filter(Boolean))]
      const cities = [...new Set(validBookings.map(b => b.guest_city).filter(Boolean))]
      const countries = [...new Set(validBookings.map(b => b.guest_country?.replace(/\.$/, '').trim()).filter(Boolean))]
      
      setUniqueProvinces(provinces.sort())
      setUniqueCities(cities.sort())
      setUniqueCountries(countries.sort())
      
      const todayStr = new Date().toISOString().split('T')[0]
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)
      
      const arrivals = validBookings.filter(b => b.check_in_date === todayStr)
      const checkouts = validBookings.filter(b => b.check_out_date === todayStr)
      
      const stayovers = validBookings.filter(b => {
        if (!b.check_in_date) return false
        const checkInDate = new Date(b.check_in_date)
        checkInDate.setHours(0, 0, 0, 0)
        if (checkInDate.getTime() === todayDate.getTime()) return false
        if (checkInDate > todayDate) return false
        if (!b.check_out_date) return true
        const checkOutDate = new Date(b.check_out_date)
        checkOutDate.setHours(0, 0, 0, 0)
        return checkOutDate >= todayDate
      })
      
      setTodayArrivals(arrivals)
      setTodayStayovers(stayovers)
      setTodayCheckouts(checkouts)
      
      console.log(`📦 Loaded ${validBookings.length} bookings`)
      
    } catch (err: any) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('❌ Error loading bookings:', err)
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false)
      }
      abortControllerRef.current = null
    }
  }, [activeTab, currentPage, pageSize, currentFilters, fetchWithAuth, getBusinessId, refreshing, business])

  // Trigger bookings load when dependencies change
  useEffect(() => {
    if (business) {
      loadBookings()
    }
  }, [business, currentPage, pageSize, activeTab, currentFilters, loadBookings])

  const refreshData = useCallback(() => {
    if (business) {
      loadBookings()
    }
  }, [loadBookings, business])

  return {
    business,
    bookings,
    loading,
    initialLoading,
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
  }
}
