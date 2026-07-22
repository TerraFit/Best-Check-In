// src/hooks/useGuestDetails.ts
// ✅ Complete with debug logging

import { useState, useCallback } from 'react';
import { GuestDetails, FoodRestrictions } from '../types/guest';

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
      setGuestDetails(data);
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

      return result;
    } catch (err) {
      console.error('❌ useGuestDetails: Error saving restrictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save restrictions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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
    resetGuestDetails
  };
}
