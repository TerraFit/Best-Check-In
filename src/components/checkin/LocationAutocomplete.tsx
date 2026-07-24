// src/components/checkin/LocationAutocomplete.tsx
// ✅ Uses your locationIntelligenceService correctly

import React, { useState, useRef, useEffect } from 'react';
import { correctLocation, LocationResult } from '../../services/locationIntelligenceService';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  country: string;
  placeholder: string;
  label: string;
  required?: boolean;
  error?: string;
  touched?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  onBlur,
  country,
  placeholder,
  label,
  required = false,
  error,
  touched,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get suggestions based on current input
  const getSuggestions = (input: string): LocationResult[] => {
    if (!input || input.length < 2) return [];

    // Use your service to get the correction
    const result = correctLocation(input);
    
    // If there's a correction with high confidence, show it as a suggestion
    if (result.isCorrection && result.confidence > 0.8) {
      return [result];
    }
    
    // Could expand to show multiple suggestions here
    return [];
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSelectedValue(newValue);
    onChange(newValue); // ← Pass raw value, don't correct!

    // Get suggestions for display
    if (newValue.length >= 2) {
      const results = getSuggestions(newValue);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: LocationResult) => {
    setSelectedValue(suggestion.corrected);
    onChange(suggestion.corrected); // ← Only correct on selection
    setShowSuggestions(false);
    if (onBlur) onBlur(suggestion.corrected);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        
        // Only correct on blur if there's a high-confidence match
        const result = correctLocation(value);
        if (result.isCorrection && result.confidence > 0.95 && result.corrected !== value) {
          // Auto-correct only for very high confidence matches (abbreviations, former names)
          console.log(`🔍 Auto-correcting "${value}" → "${result.corrected}" (confidence: ${result.confidence})`);
          onChange(result.corrected);
          setSelectedValue(result.corrected);
        }
        
        if (onBlur) onBlur(value);
      }
    }, 150);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-stone-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={selectedValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (value.length >= 2) {
            const results = getSuggestions(value);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
          }
        }}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
          error && touched
            ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
            : 'border-stone-200 focus:ring-amber-500 focus:border-amber-500'
        }`}
      />
      {error && touched && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-amber-50 transition-colors flex items-center justify-between group"
            >
              <div>
                <span className="text-stone-800">{suggestion.corrected}</span>
                {suggestion.isCorrection && (
                  <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    {suggestion.confidence > 0.95 ? '✓ Verified' : 'Suggested'}
                  </span>
                )}
                {suggestion.province && (
                  <span className="ml-2 text-xs text-stone-400">
                    {suggestion.province}
                  </span>
                )}
              </div>
              <span className="text-xs text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {suggestion.country}
              </span>
            </button>
          ))}
          <div className="px-4 py-1.5 text-xs text-stone-400 border-t border-stone-100">
            Press Tab or click to select
          </div>
        </div>
      )}
    </div>
  );
}
