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

  const loadBusinessProfile = useCallback(async () => {
    const businessId = getBusinessId()
    if (!businessId) {
      setLoading(false)
      setInitialLoading(false)
      return
    }

    try {
      console.log('📡 Loading business profile for ID:', businessId)
      const res = await fetchWithAuth(`/.netlify/functions/get-business-branding?id=${businessId}`)
      
      if (!res.ok) {
        setLoading(false)
        setInitialLoading(false)
        return
      }
      
      const data = await res.json()
      
      let businessData
      if (data.success && data.data) {
        businessData = data.data
      } else if (data.id) {
        businessData = data
      } else {
        businessData = data
      }
      
      setBusiness(businessData)
      
      if (businessData?.trial_end) {
        const trialEnd = new Date(businessData.trial_end)
        const today = new Date()
        const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        // These will be handled by the component or a separate subscription hook
      }
      
      console.log('✅ Business profile loaded:', businessData?.trading_name)
    } catch (err) {
      console.error('❌ Failed to load business profile:', err)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [fetchWithAuth, getBusinessId])

  const loadBookings = useCallback(async () => {
    if (refreshing) {
      console.log('⏭️ Skipping duplicate loadBookings call')
      return
    }

    const businessId = getBusinessId()
    if (!businessId) return

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
            const startDateParam = cutoffDate.toISOString().split('T')[0]
            url += `&startDate=${startDateParam}`
          }
        }
      }
      
      const res = await fetchWithAuth(url, { signal: controller.signal })
      const result = await res.json()
      
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
      
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('❌ Error loading bookings:', err)
      }
    } finally {
      setRefreshing(false)
      abortControllerRef.current = null
    }
  }, [activeTab, currentPage, pageSize, currentFilters, fetchWithAuth, getBusinessId, refreshing])

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
      
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      
      if (Array.isArray(data)) {
        const newlyRejected = data.filter((req: ChangeRequest) => 
          req.status === 'rejected' && 
          req.reviewed_at && 
          new Date(req.reviewed_at) > oneDayAgo &&
          !localStorage.getItem(`rejection_notified_${req.id}`)
        )
        
        for (const request of newlyRejected) {
          const userChoice = confirm(
            `❌ Change Request Rejected\n\n` +
            `Field: ${request.field_name}\n` +
            `Requested: ${request.requested_value}\n\n` +
            `Reason: ${request.rejection_reason || 'No specific reason provided'}\n\n` +
            `Would you like to appeal this decision?`
          )
          
          if (userChoice) {
            setRejectedRequest(request)
          }
          localStorage.setItem(`rejection_notified_${request.id}`, 'true')
        }
        
        const newlyApproved = data.filter((req: ChangeRequest) => 
          req.status === 'approved' && 
          req.reviewed_at && 
          new Date(req.reviewed_at) > oneDayAgo &&
          !localStorage.getItem(`approval_notified_${req.id}`)
        )
        
        for (const request of newlyApproved) {
          alert(`✅ Change Request Approved!\n\nYour request to change "${request.field_name}" to "${request.requested_value}" has been approved.`)
          localStorage.setItem(`approval_notified_${request.id}`, 'true')
          loadBusinessProfile()
        }
      }
    } catch (error) {
      console.error('Error fetching change requests:', error)
    }
  }, [fetchWithAuth, getBusinessId, loadBusinessProfile])

  const refreshData = useCallback(() => {
    loadBookings()
    fetchChangeRequests()
  }, [loadBookings, fetchChangeRequests])

  useEffect(() => {
    loadBusinessProfile()
  }, [])

  useEffect(() => {
    if (business) {
      loadBookings()
      fetchChangeRequests()
    }
  }, [business, currentPage, pageSize, activeTab, currentFilters])

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
