// src/hooks/useGuestDetails.ts

import { useState, useCallback } from 'react';
import { GuestDetails, FoodRestrictions } from '../types/guest';

export function useGuestDetails() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);

  const fetchGuestDetails = useCallback(async (bookingId: string) => {
    if (!bookingId) {
      setError('No booking ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching guest details for:', bookingId);
      
      const response = await fetch(
        `/.netlify/functions/get-guest-details?bookingId=${encodeURIComponent(bookingId)}`
      );

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Guest details received:', data);
      setGuestDetails(data);
    } catch (err) {
      console.error('❌ Error fetching guest details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch guest details');
      // Don't throw - let the UI handle the error state
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

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/save-food-restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, restrictions })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
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
      console.error('❌ Error saving restrictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save restrictions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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
    resetGuestDetails
  };
}
