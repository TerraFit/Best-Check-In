// src/CheckInApp.tsx
// ✅ With debug logs to track re-mounts

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckInForm } from './components/checkin/CheckInForm';
import { Booking } from './types';

export default function CheckInApp() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();

  // ✅ DEBUG: Log when component mounts/unmounts
  useEffect(() => {
    console.log('🟢 CheckInApp: MOUNTED', { 
      businessId,
      timestamp: new Date().toISOString(),
    });
    return () => {
      console.log('🔴 CheckInApp: UNMOUNTED', {
        businessId,
        timestamp: new Date().toISOString(),
      });
    };
  }, [businessId]);

  // ✅ DEBUG: Log each render
  console.log('🔄 CheckInApp: RENDER', { businessId });

  const handleCheckinComplete = (booking: Booking, indemnityToken?: string) => {
    console.log('✅ Check-in complete!', booking);
  };

  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Check-in</h1>
          <p className="text-stone-600">No business ID provided.</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <CheckInForm 
        onComplete={handleCheckinComplete}
        businessId={businessId}
        resetOnMount={true}
      />
    </div>
  );
}
