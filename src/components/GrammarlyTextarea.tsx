// src/components/GrammarlyTextarea.tsx
// ✅ Grammarly-enhanced textarea component

import React, { forwardRef, useRef, useEffect } from 'react';
import { isGrammarlyEnabled } from '../services/grammarlyService';

interface GrammarlyTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  grammarlyEnabled?: boolean;
  onCorrection?: (corrected: string) => void;
}

export const GrammarlyTextarea = forwardRef<HTMLTextAreaElement, GrammarlyTextareaProps>(
  ({ 
    grammarlyEnabled = true, 
    onCorrection,
    onChange,
    className = '',
    ...props 
  }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hasGrammarly = isGrammarlyEnabled() && grammarlyEnabled;

    useEffect(() => {
      if (hasGrammarly && textareaRef.current) {
        textareaRef.current.setAttribute('data-grammarly', 'true');
      }
    }, [hasGrammarly]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        ref={ref || textareaRef}
        className={`${className} ${hasGrammarly ? 'grammarly-enhanced' : ''}`}
        data-grammarly={hasGrammarly ? 'true' : 'false'}
        data-grammarly-ignore={!hasGrammarly ? 'true' : 'false'}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

GrammarlyTextarea.displayName = 'GrammarlyTextarea';
