// src/hooks/useGuestDetails.ts
// Guest detail reads and booking mutations send the canonical authentication header.

import { useState, useCallback } from 'react';
import { GuestDetails, FoodRestrictions, StayUpdateData } from '../types/guest';
import { getAuthHeader } from '../utils/auth';

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
        `/.netlify/functions/get-guest-details?bookingId=${encodeURIComponent(bookingId)}`,
        { headers: { ...getAuthHeader(), 'Content-Type': 'application/json' } }
      );

      console.log('📡 useGuestDetails: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ useGuestDetails: API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ useGuestDetails: Guest details received:', data);
      setGuestDetails(data);
    } catch (err) {
      console.error('❌ useGuestDetails: Error fetching guest details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch guest details');
    } finally {
      setLoading(false);
    }
  }, []);

  const getBusinessId = useCallback((): string | null => {
    try {
      const authStr = localStorage.getItem('fastcheckin_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        return auth.user?.businessId || null;
      }
    } catch (e) {
      console.warn('Could not get business_id from auth:', e);
    }

    try {
      const businessStr = localStorage.getItem('business');
      if (businessStr) {
        const business = JSON.parse(businessStr);
        return business.id || null;
      }
    } catch (e) {
      console.warn('Could not get business_id from business storage:', e);
    }

    return null;
  }, []);

  const updateFoodRestrictions = useCallback(async (
    bookingId: string,
    restrictions: FoodRestrictions
  ) => {
    if (!bookingId) throw new Error('No booking ID provided');

    setLoading(true);
    setError(null);

    try {
      const businessId = getBusinessId();
      const response = await fetch('/.netlify/functions/save-food-restrictions', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, restrictions, business_id: businessId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.restrictions) {
        setGuestDetails(prev => prev ? { ...prev, food_restrictions: result.restrictions } : null);
      }

      await addAuditLog({
        bookingId,
        action: 'UPDATE_FOOD_RESTRICTIONS',
        details: restrictions,
        description: `Updated food restrictions for guest ${guestDetails?.guest_name || 'Unknown'}`,
        businessId: businessId || undefined
      });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save restrictions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guestDetails, getBusinessId]);

  const updateStayDetails = useCallback(async (
    bookingId: string,
    data: StayUpdateData
  ) => {
    if (!bookingId) throw new Error('No booking ID provided');

    setLoading(true);
    setError(null);

    try {
      const businessId = getBusinessId();
      const response = await fetch('/.netlify/functions/update-booking-stay', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, ...data, business_id: businessId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.booking) {
        setGuestDetails(prev => prev ? {
          ...prev,
          check_in_date: result.booking.check_in_date || prev.check_in_date,
          check_out_date: result.booking.check_out_date || prev.check_out_date,
          nights: result.booking.nights || prev.nights,
        } : null);
      }

      await addAuditLog({
        bookingId,
        action: 'UPDATE_STAY_DETAILS',
        details: data,
        description: `Updated stay details for guest ${guestDetails?.guest_name || 'Unknown'}`,
        businessId: businessId || undefined
      });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stay details');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guestDetails, getBusinessId]);

  const addAuditLog = useCallback(async (logData: {
    bookingId: string;
    action: string;
    details: any;
    description: string;
    businessId?: string;
  }) => {
    try {
      const authStr = localStorage.getItem('fastcheckin_auth');
      const auth = authStr ? JSON.parse(authStr) : null;
      const user = auth?.user || { id: '00000000-0000-0000-0000-000000000000', name: 'Unknown User' };

      let businessId = logData.businessId || null;
      if (!businessId) businessId = getBusinessId();
      if (!businessId) businessId = '00000000-0000-0000-0000-000000000000';

      const auditLog = {
        business_id: businessId,
        user_id: user.id || '00000000-0000-0000-0000-000000000000',
        user_name: user.name || user.full_name || 'Unknown User',
        user_role: user.role || 'owner',
        action: logData.action,
        details: logData.details,
        description: logData.description,
        booking_id: logData.bookingId,
        guest_name: guestDetails?.guest_name || null,
        ip_address: await getIPAddress(),
        user_agent: navigator.userAgent
      };

      const response = await fetch('/.netlify/functions/create-audit-log', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(auditLog)
      });

      if (response.ok) await response.json();
    } catch (err) {
      console.warn('⚠️ Audit log error (non-critical):', err);
    }
  }, [guestDetails, getBusinessId]);

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
