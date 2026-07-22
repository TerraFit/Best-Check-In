import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckInForm } from './components/checkin/CheckInForm';
import { Booking } from './types';

export default function CheckInApp() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();

  const handleCheckinComplete = (booking: Booking, indemnityToken?: string) => {
    console.log('✅ Check-in complete!', booking);
    
    // Optionally navigate to a success page or stay on the same page
    // The CheckInForm already shows a success step internally
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
        resetOnMount={true}  // ✅ THIS IS THE KEY FIX - always start fresh
      />
    </div>
  );
}
