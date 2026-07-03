// src/hooks/useGuestDetails.ts
import { useState, useCallback } from 'react';
import { GuestDetails, FoodRestrictions } from '../types/guest';

export function useGuestDetails() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);

  const fetchGuestDetails = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/.netlify/functions/get-guest-details?bookingId=${encodeURIComponent(bookingId)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch guest details');
      }

      const data = await response.json();
      setGuestDetails(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch guest details');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFoodRestrictions = useCallback(async (
    bookingId: string,
    restrictions: FoodRestrictions
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/update-food-restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, restrictions })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update restrictions');
      }

      const result = await response.json();
      
      // Update local state
      if (guestDetails) {
        setGuestDetails({
          ...guestDetails,
          food_restrictions: result.restrictions
        });
      }

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update restrictions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guestDetails]);

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
