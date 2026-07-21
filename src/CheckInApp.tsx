// src/CheckInApp.tsx
// ✅ Simplified wrapper that just renders the refactored CheckInForm

import React from 'react';
import { CheckInForm } from './components/checkin/CheckInForm';
import { Booking } from './types';

interface CheckInAppProps {
  onComplete: (booking: Booking, indemnityToken?: string) => void;
  businessId?: string;
}

export default function CheckInApp({ onComplete, businessId }: CheckInAppProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      <CheckInForm 
        onComplete={onComplete} 
        businessId={businessId} 
      />
    </div>
  );
}
