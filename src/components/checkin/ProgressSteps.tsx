// src/components/checkin/ProgressSteps.tsx
import React from 'react';

interface ProgressStepsProps {
  currentStep: number;
  totalSteps: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export function ProgressSteps({ currentStep, totalSteps, primaryColor = '#f59e0b', secondaryColor = '#1e1e1e' }: ProgressStepsProps) {
  return (
    <div className="flex justify-center mb-8 items-center space-x-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
        <React.Fragment key={s}>
          <div 
            className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all ${
              currentStep >= s 
                ? 'text-white shadow-lg' 
                : 'bg-stone-200 text-stone-500'
            }`}
            style={currentStep >= s ? { backgroundColor: primaryColor } : {}}
          >
            {s}
          </div>
          {s < totalSteps && (
            <div 
              className={`w-12 h-0.5 transition-all ${
                currentStep > s ? 'bg-stone-900' : 'bg-stone-200'
              }`}
              style={currentStep > s ? { backgroundColor: secondaryColor } : {}}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
