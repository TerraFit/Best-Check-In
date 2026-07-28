// src/hooks/useGuestDetails.ts
// ✅ FIXED: Extracts guest data from API response correctly
// ✅ ADDED: Audit logging for all updates

import { useState, useCallback } from 'react';

export interface GuestDetails {
  id: string;
  guest_name: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  check_in_date?: string;
  check_out_date?: string;
  nights?: number;
  adults?: number;
  children?: number;
  status?: string;
  total_amount?: number;
  room_id?: string | null;
  room_number?: string | null;
  room_name?: string | null;
  room_type?: string | null;
  floor?: string | null;
  room_status?: string | null;
  arriving_from?: string;
  next_destination?: string;
  booking_source?: string;
  referral_source?: string;
  marketing_consent?: boolean;
  food_restrictions?: FoodRestrictions;
  created_at?: string;
  booking_reference?: string;
}

export interface FoodRestrictions {
  vegetarian: boolean;
  vegan: boolean;
  pescatarian: boolean;
  halal: boolean;
  kosher: boolean;
  gluten_free: boolean;
  lactose_free: boolean;
  nut_allergy: boolean;
  seafood_allergy: boolean;
  diabetic: boolean;
  no_pork: boolean;
  carnivore: boolean;
  other: boolean;
  other_text: string;
}

export interface StayUpdateData {
  check_in_date: string;
  check_out_date: string;
  nights: number;
}

export function useGuestDetails() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);

  const fetchGuestDetails = useCallback(async (bookingId: string) => {
    if (!bookingId) {
      console.error('❌ No booking ID provided');
      setError('No booking ID provided');
      return;
    }

    console.log('🔍 useGuestDetails: Fetching guest details for:', bookingId);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/.netlify/functions/get-guest-details?bookingId=${encodeURIComponent(bookingId)}`
      );

      console.log('📡 useGuestDetails: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ useGuestDetails: API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ useGuestDetails: Guest details received:', data);

      // ✅ FIXED: Extract the guest from the response
      if (data.success && data.guest) {
        setGuestDetails(data.guest);
        console.log('✅ useGuestDetails: Guest data extracted:', data.guest);
      } else {
        console.warn('⚠️ useGuestDetails: No guest data in response');
        setGuestDetails(null);
      }
    } catch (err) {
      console.error('❌ useGuestDetails: Error fetching guest details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch guest details');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFoodRestrictions = useCallback(async (
    bookingId: string,
    restrictions: FoodRestrictions
  ) => {
    if (!bookingId) {
      throw new Error('No booking ID provided');
    }

    console.log('💾 useGuestDetails: Saving restrictions for:', bookingId);
    console.log('💾 useGuestDetails: Restrictions:', restrictions);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/save-food-restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, restrictions })
      });

      console.log('📡 useGuestDetails: Save response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ useGuestDetails: Save error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ useGuestDetails: Save result:', result);
      
      if (result.success && result.restrictions) {
        setGuestDetails(prev => {
          if (!prev) return null;
          return {
            ...prev,
            food_restrictions: result.restrictions
          };
        });
      }

      // ✅ Add audit log for food restriction changes
      await addAuditLog({
        bookingId,
        action: 'UPDATE_FOOD_RESTRICTIONS',
        details: restrictions,
        description: `Updated food restrictions for guest ${guestDetails?.guest_name || 'Unknown'}`
      });

      return result;
    } catch (err) {
      console.error('❌ useGuestDetails: Error saving restrictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save restrictions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guestDetails]);

  // ✅ NEW: Update stay details with audit logging
  const updateStayDetails = useCallback(async (
    bookingId: string,
    data: StayUpdateData
  ) => {
    if (!bookingId) {
      throw new Error('No booking ID provided');
    }

    console.log('📅 useGuestDetails: Updating stay details for:', bookingId);
    console.log('📅 useGuestDetails: Data:', data);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/update-booking-stay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, ...data })
      });

      console.log('📡 useGuestDetails: Update stay response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ useGuestDetails: Update stay error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ useGuestDetails: Update stay result:', result);
      
      if (result.success && result.booking) {
        setGuestDetails(prev => {
          if (!prev) return null;
          return {
            ...prev,
            check_in_date: result.booking.check_in_date || prev.check_in_date,
            check_out_date: result.booking.check_out_date || prev.check_out_date,
            nights: result.booking.nights || prev.nights,
          };
        });
      }

      // ✅ Add audit log for stay changes
      await addAuditLog({
        bookingId,
        action: 'UPDATE_STAY_DETAILS',
        details: data,
        description: `Updated stay details for guest ${guestDetails?.guest_name || 'Unknown'}`
      });

      return result;
    } catch (err) {
      console.error('❌ useGuestDetails: Error updating stay details:', err);
      setError(err instanceof Error ? err.message : 'Failed to update stay details');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guestDetails]);

  // ✅ NEW: Add audit log helper
  const addAuditLog = useCallback(async (logData: {
    bookingId: string;
    action: string;
    details: any;
    description: string;
  }) => {
    try {
      // Get current user from auth
      const authStr = localStorage.getItem('fastcheckin_auth');
      const auth = authStr ? JSON.parse(authStr) : null;
      const user = auth?.user || { id: 'unknown', name: 'Unknown User' };

      const response = await fetch('/.netlify/functions/create-audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: guestDetails?.id ? guestDetails.id : 'unknown',
          user_id: user.id || 'unknown',
          user_name: user.name || user.full_name || 'Unknown User',
          action: logData.action,
          details: logData.details,
          description: logData.description,
          booking_id: logData.bookingId,
          ip_address: await getIPAddress(),
          user_agent: navigator.userAgent
        })
      });

      if (response.ok) {
        console.log('✅ Audit log created for:', logData.action);
      } else {
        console.warn('⚠️ Failed to create audit log:', await response.text());
      }
    } catch (err) {
      console.warn('⚠️ Audit log error (non-critical):', err);
    }
  }, [guestDetails]);

  // ✅ Helper to get IP address (optional)
  const getIPAddress = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const resetGuestDetails = useCallback(() => {
    console.log('🔄 useGuestDetails: Resetting guest details');
    setGuestDetails(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    guestDetails,
    loading,
    error,
    fetchGuestDetails,
    updateFoodRestrictions,
    updateStayDetails,
    resetGuestDetails
  };
}
