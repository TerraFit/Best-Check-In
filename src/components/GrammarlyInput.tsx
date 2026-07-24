// src/components/GrammarlyInput.tsx
// ✅ Grammarly-enhanced input component

import React, { forwardRef, useRef, useEffect } from 'react';
import { isGrammarlyEnabled } from '../services/grammarlyService';

interface GrammarlyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  grammarlyEnabled?: boolean;
  onCorrection?: (corrected: string) => void;
}

export const GrammarlyInput = forwardRef<HTMLInputElement, GrammarlyInputProps>(
  ({ 
    grammarlyEnabled = true, 
    onCorrection,
    onChange,
    className = '',
    ...props 
  }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const hasGrammarly = isGrammarlyEnabled() && grammarlyEnabled;

    // Apply Grammarly attributes when available
    useEffect(() => {
      if (hasGrammarly && inputRef.current) {
        // Grammarly will automatically detect and enhance the input
        // based on the data-grammarly attribute
        inputRef.current.setAttribute('data-grammarly', 'true');
      }
    }, [hasGrammarly]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Pass through to parent onChange
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <input
        ref={ref || inputRef}
        className={`${className} ${hasGrammarly ? 'grammarly-enhanced' : ''}`}
        data-grammarly={hasGrammarly ? 'true' : 'false'}
        data-grammarly-ignore={!hasGrammarly ? 'true' : 'false'}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

GrammarlyInput.displayName = 'GrammarlyInput';
