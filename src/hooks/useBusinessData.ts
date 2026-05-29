// src/hooks/useBusinessData.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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

interface ChangeRequest {
  id: string
  field_name: string
  requested_value: string
  status: string
  reviewed_at?: string
  rejection_reason?: string
}

export function useBusinessData(activeTab: string, currentPage: number, pageSize: number, currentFilters: any) {
  const { fetchWithAuth, getBusinessId } = useAuth()
  
  // State
  const [business, setBusiness] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalBookingsCount, setTotalBookingsCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [rejectedRequest, setRejectedRequest] = useState<ChangeRequest | null>(null)
  
  const [todayArrivals, setTodayArrivals] = useState<Booking[]>([])
  const [todayStayovers, setTodayStayovers] = useState<Booking[]>([])
  const [todayCheckouts, setTodayCheckouts] = useState<Booking[]>([])
  
  const [uniqueProvinces, setUniqueProvinces] = useState<string[]>([])
  const [uniqueCities, setUniqueCities] = useState<string[]>([])
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([])
  
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Memoize dependencies to prevent infinite loops
  const memoizedFilters = useMemo(() => currentFilters, [
    currentFilters?.dateRange,
    currentFilters?.startDate,
    currentFilters?.endDate,
    currentFilters?.searchTerm,
    currentFilters?.statusFilter,
    currentFilters?.provinceFilter,
    currentFilters?.cityFilter,
    currentFilters?.countryFilter
  ])

  // Load Business Profile
  const loadBusinessProfile = useCallback(async () => {
    console.log('📡 Loading business profile...')
    const businessId = getBusinessId()
    
    if (!businessId) {
      console.error('❌ No business ID found')
      setLoading(false)
      setInitialLoading(false)
      return
    }

    try {
      const res = await fetchWithAuth(`/.netlify/functions/get-business-branding?id=${businessId}`)
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      
      const data = await res.json()
      const businessData = data.success && data.data ? data.data : data.id ? data : data
      
      setBusiness(businessData)
      console.log('✅ Business profile loaded:', businessData?.trading_name)
      
    } catch (err) {
      console.error('❌ Failed to load business profile:', err)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [fetchWithAuth, getBusinessId])

  // Load Bookings
  const loadBookings = useCallback(async () => {
    const businessId = getBusinessId()
    if (!businessId) {
      console.warn('⚠️ No businessId found')
      return
    }

    // Prevent concurrent requests
    if (refreshing) {
      console.log('⏭️ Skipping duplicate loadBookings call')
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setRefreshing(true)

    try {
      // Build URL
      let url = `/.netlify/functions/get-business-bookings?businessId=${businessId}`
      
      if (activeTab === 'reports') {
        url += `&limit=10000&page=1`
      } else {
        url += `&limit=${pageSize}&page=${currentPage}`
      }
      
      // Add date filters for reports and checkins tabs
      if (activeTab === 'reports' || activeTab === 'checkins') {
        if (memoizedFilters?.startDate && memoizedFilters?.endDate) {
          url += `&startDate=${memoizedFilters.startDate}&endDate=${memoizedFilters.endDate}`
        } else if (memoizedFilters?.dateRange && memoizedFilters.dateRange !== 'all') {
          const days: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90, '12months': 365 }
          if (days[memoizedFilters.dateRange]) {
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - days[memoizedFilters.dateRange])
            url += `&startDate=${cutoffDate.toISOString().split('T')[0]}`
          }
        }
      }
      
      console.log('🔗 Fetching bookings:', url)
      const res = await fetchWithAuth(url, { signal: controller.signal })
      const result = await res.json()
      
      // Parse response
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
      
      // Update pagination
      if (activeTab !== 'reports') {
        setTotalBookingsCount(result.total_count || validBookings.length)
        const calculatedTotalPages = result.total_pages || Math.ceil((result.total_count || validBookings.length) / pageSize)
        setTotalPages(calculatedTotalPages)
      } else {
        setTotalBookingsCount(validBookings.length)
        setTotalPages(1)
      }
      
      // Update unique filter values
      const provinces = [...new Set(validBookings.map(b => b.guest_province).filter(Boolean))]
      const cities = [...new Set(validBookings.map(b => b.guest_city).filter(Boolean))]
      const countries = [...new Set(validBookings.map(b => b.guest_country?.replace(/\.$/, '').trim()).filter(Boolean))]
      
      setUniqueProvinces(provinces.sort())
      setUniqueCities(cities.sort())
      setUniqueCountries(countries.sort())
      
      // Calculate today's activity
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
      if (err.name !== 'AbortError') {
        console.error('❌ Error loading bookings:', err)
      }
    } finally {
      setRefreshing(false)
      abortControllerRef.current = null
    }
  }, [activeTab, currentPage, pageSize, memoizedFilters, fetchWithAuth, getBusinessId, refreshing])

  // Fetch Change Requests
  const fetchChangeRequests = useCallback(async () => {
    const businessId = getBusinessId()
    if (!businessId) return
    
    try {
      const response = await fetchWithAuth(`/.netlify/functions/get-change-requests?businessId=${businessId}`)
      const result = await response.json()
      
      let data = []
      if (result.success && Array.isArray(result.data)) {
        data = result.data
      } else if (Array.isArray(result)) {
        data = result
      }
      
      setChangeRequests(data)
      
      // Check for newly rejected/approved requests
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      
      if (Array.isArray(data)) {
        for (const request of data) {
          if (request.status === 'rejected' && request.reviewed_at && new Date(request.reviewed_at) > oneDayAgo && !localStorage.getItem(`rejection_notified_${request.id}`)) {
            const userChoice = confirm(
              `❌ Change Request Rejected\n\n` +
              `Field: ${request.field_name}\n` +
              `Requested: ${request.requested_value}\n\n` +
              `Reason: ${request.rejection_reason || 'No specific reason provided'}\n\n` +
              `Would you like to appeal this decision?`
            )
            if (userChoice) setRejectedRequest(request)
            localStorage.setItem(`rejection_notified_${request.id}`, 'true')
          } else if (request.status === 'approved' && request.reviewed_at && new Date(request.reviewed_at) > oneDayAgo && !localStorage.getItem(`approval_notified_${request.id}`)) {
            alert(`✅ Change Request Approved!\n\nYour request to change "${request.field_name}" to "${request.requested_value}" has been approved.`)
            localStorage.setItem(`approval_notified_${request.id}`, 'true')
            loadBusinessProfile()
          }
        }
      }
    } catch (error) {
      console.error('Error fetching change requests:', error)
    }
  }, [fetchWithAuth, getBusinessId, loadBusinessProfile])

  // Refresh Data
  const refreshData = useCallback(() => {
    loadBookings()
    fetchChangeRequests()
  }, [loadBookings, fetchChangeRequests])

  // Initial load - only once
  useEffect(() => {
    loadBusinessProfile()
  }, [loadBusinessProfile])

  // Reload when dependencies change - only after business is loaded
  useEffect(() => {
    if (business) {
      loadBookings()
      fetchChangeRequests()
    }
  }, [business, currentPage, pageSize, activeTab, memoizedFilters, loadBookings, fetchChangeRequests])

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    business,
    bookings,
    loading,
    initialLoading,
    refreshing,
    totalBookingsCount,
    totalPages,
    changeRequests,
    rejectedRequest,
    setRejectedRequest,
    todayArrivals,
    todayStayovers,
    todayCheckouts,
    uniqueProvinces,
    uniqueCities,
    uniqueCountries,
    loadBusinessProfile,
    loadBookings,
    fetchChangeRequests,
    refreshData,
    setRefreshing
  }
}
