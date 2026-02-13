import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export default function ProgressBar({ currentStep, totalSteps, labels }: ProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isComplete = stepNumber < currentStep;
          
          return (
            <React.Fragment key={stepNumber}>
              <div className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                  ${isComplete ? 'bg-amber-600 text-white' : ''}
                  ${isActive ? 'bg-stone-900 text-white ring-4 ring-amber-200' : ''}
                  ${!isActive && !isComplete ? 'bg-stone-200 text-stone-500' : ''}
                `}>
                  {isComplete ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                <span className={`
                  ml-3 text-xs font-bold uppercase tracking-widest hidden md:block
                  ${isActive ? 'text-stone-900' : 'text-stone-400'}
                `}>
                  {labels[index]}
                </span>
              </div>
              {stepNumber < totalSteps && (
                <div className={`
                  flex-1 h-1 mx-4 rounded-full
                  ${stepNumber < currentStep ? 'bg-amber-600' : 'bg-stone-200'}
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Mobile labels */}
      <div className="flex justify-between mt-2 md:hidden">
        {labels.map((label, index) => (
          <span key={index} className={`
            text-[8px] font-bold uppercase tracking-widest
            ${index + 1 === currentStep ? 'text-stone-900' : 'text-stone-400'}
          `}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
