// src/hooks/useGuestDetails.ts

import { useState, useCallback } from 'react';
import { GuestDetails, FoodRestrictions } from '../types/guest';

export function useGuestDetails() {
  const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuestDetails = useCallback(async (bookingId: string) => {
    if (!bookingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/.netlify/functions/get-booking-details?bookingId=${bookingId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch guest details');
      }

      const data = await response.json();
      setGuestDetails(data);
    } catch (err) {
      console.error('Error fetching guest details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load guest details');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFoodRestrictions = useCallback(async (bookingId: string, restrictions: FoodRestrictions) => {
    if (!bookingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/save-food-restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          ...restrictions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save food restrictions');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setGuestDetails(prev => {
          if (!prev) return null;
          return {
            ...prev,
            food_restrictions: data.data
          };
        });
      }

      return data;
    } catch (err) {
      console.error('Error saving food restrictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save restrictions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    guestDetails,
    loading,
    error,
    fetchGuestDetails,
    updateFoodRestrictions,
    setGuestDetails
  };
}
