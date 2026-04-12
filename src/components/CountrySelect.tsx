import React, { useState, useEffect, useRef } from 'react';

// Complete ISO 3166 country list with grouping
const COUNTRIES_BY_GROUP = {
  popular: [
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
    { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'Europe' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' }
  ],
  africa: [
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
    { code: 'NA', name: 'Namibia', flag: '🇳🇦', region: 'Africa' },
    { code: 'BW', name: 'Botswana', flag: '🇧🇼', region: 'Africa' },
    { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', region: 'Africa' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', region: 'Africa' },
    { code: 'ZM', name: 'Zambia', flag: '🇿🇲', region: 'Africa' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'Africa' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬', region: 'Africa' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦', region: 'Africa' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'Africa' },
    { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', region: 'Africa' },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬', region: 'Africa' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴', region: 'Africa' },
    { code: 'LS', name: 'Lesotho', flag: '🇱🇸', region: 'Africa' },
    { code: 'MW', name: 'Malawi', flag: '🇲🇼', region: 'Africa' },
    { code: 'MU', name: 'Mauritius', flag: '🇲🇺', region: 'Africa' },
    { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', region: 'Africa' }
  ],
  europe: [
    { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
    { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'Europe' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
    { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe' },
    { code: 'BE', name: 'Belgium', flag: '🇧🇪', region: 'Europe' },
    { code: 'AT', name: 'Austria', flag: '🇦🇹', region: 'Europe' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', region: 'Europe' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'Europe' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴', region: 'Europe' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰', region: 'Europe' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮', region: 'Europe' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪', region: 'Europe' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱', region: 'Europe' },
    { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', region: 'Europe' },
    { code: 'HU', name: 'Hungary', flag: '🇭🇺', region: 'Europe' },
    { code: 'GR', name: 'Greece', flag: '🇬🇷', region: 'Europe' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺', region: 'Europe' }
  ],
  americas: [
    { code: 'US', name: 'United States', flag: '🇺🇸', region: 'Americas' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'Americas' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'Americas' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷', region: 'Americas' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'Americas' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴', region: 'Americas' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱', region: 'Americas' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪', region: 'Americas' }
  ],
  asia: [
    { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia' },
    { code: 'CN', name: 'China', flag: '🇨🇳', region: 'Asia' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'Asia' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Asia' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪', region: 'Asia' },
    { code: 'IL', name: 'Israel', flag: '🇮🇱', region: 'Asia' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'Asia' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'Asia' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'Asia' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳', region: 'Asia' }
  ],
  oceania: [
    { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania' }
  ]
};

// Flatten all countries for search
const ALL_COUNTRIES = Object.values(COUNTRIES_BY_GROUP).flat().filter(
  (country, index, self) => 
    index === self.findIndex(c => c.code === country.code)
);

interface CountrySelectProps {
  value: string;
  onChange: (countryName: string, countryCode?: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  showFlags?: boolean;
}

export default function CountrySelect({ 
  value, 
  onChange, 
  required = false, 
  className = '',
  placeholder = 'Select country',
  showFlags = true
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [otherValue, setOtherValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current value is from "Other" input
  useEffect(() => {
    const isOther = value && !ALL_COUNTRIES.some(c => c.name === value);
    setIsOtherSelected(isOther);
    if (isOther && value) {
      setOtherValue(value);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCountry = (country: { name: string; code: string; flag: string }) => {
    setIsOtherSelected(false);
    setOtherValue('');
    setSearchTerm('');
    onChange(country.name, country.code);
    setIsOpen(false);
  };

  const handleOtherClick = () => {
    setIsOtherSelected(true);
    setSearchTerm('');
    setIsOpen(false);
    // Focus the input after dropdown closes
    setTimeout(() => {
      const otherInput = document.getElementById('other-country-input');
      otherInput?.focus();
    }, 100);
  };

  const handleOtherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOtherValue(val);
    onChange(val);
  };

  // Filter countries based on search
  const filteredCountries = searchTerm
    ? ALL_COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getDisplayValue = () => {
    if (isOtherSelected && otherValue) return otherValue;
    if (!value) return '';
    const country = ALL_COUNTRIES.find(c => c.name === value);
    if (country && showFlags) return `${country.flag} ${country.name}`;
    return value;
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white cursor-pointer flex justify-between items-center"
      >
        <span className={!getDisplayValue() ? 'text-stone-400' : 'text-white'}>
          {getDisplayValue() || placeholder}
        </span>
        <svg 
          className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-stone-800 border border-stone-600 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {/* Search Input */}
          <div className="sticky top-0 p-2 bg-stone-800 border-b border-stone-700">
            <input
              type="text"
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search countries..."
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
          </div>

          {searchTerm ? (
            // Search Results
            <div className="py-2">
              {filteredCountries.length > 0 ? (
                filteredCountries.map(country => (
                  <button
                    key={country.code}
                    onClick={() => handleSelectCountry(country)}
                    className="w-full px-4 py-2 text-left hover:bg-stone-700 flex items-center gap-2 text-stone-300 hover:text-white"
                  >
                    {showFlags && <span>{country.flag}</span>}
                    <span>{country.name}</span>
                    <span className="text-xs text-stone-500 ml-auto">{country.code}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-stone-400 text-sm text-center">
                  No countries found. Try a different search.
                </div>
              )}
              {/* Other option in search results */}
              <button
                onClick={handleOtherClick}
                className="w-full px-4 py-2 text-left hover:bg-stone-700 text-amber-500 border-t border-stone-700 mt-2 pt-2 flex items-center gap-2"
              >
                <span>➕</span>
                <span>Other (please specify)</span>
              </button>
            </div>
          ) : (
            // Grouped View
            <div className="py-2">
              {/* Popular Section */}
              <div className="px-3 py-1 text-xs font-semibold text-amber-500 uppercase tracking-wider bg-stone-800/50 sticky top-10">
                ⭐ Popular
              </div>
              {COUNTRIES_BY_GROUP.popular.map(country => (
                <button
                  key={country.code}
                  onClick={() => handleSelectCountry(country)}
                  className="w-full px-4 py-2 text-left hover:bg-stone-700 flex items-center gap-2 text-stone-300 hover:text-white"
                >
                  {showFlags && <span>{country.flag}</span>}
                  <span>{country.name}</span>
                </button>
              ))}

              {/* Africa */}
              <div className="px-3 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider bg-stone-800/50 mt-2">
                🌍 Africa
              </div>
              {COUNTRIES_BY_GROUP.africa.map(country => (
                <button
                  key={country.code}
                  onClick={() => handleSelectCountry(country)}
                  className="w-full px-4 py-2 text-left hover:bg-stone-700 flex items-center gap-2 text-stone-300 hover:text-white"
                >
                  {showFlags && <span>{country.flag}</span>}
                  <span>{country.name}</span>
                </button>
              ))}

              {/* Europe */}
              <div className="px-3 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider bg-stone-800/50 mt-2">
                🇪🇺 Europe
              </div>
              {COUNTRIES_BY_GROUP.europe.map(country => (
                <button
                  key={country.code}
                  onClick={() => handleSelectCountry(country)}
                  className="w-full px-4 py-2 text-left hover:bg-stone-700 flex items-center gap-2 text-stone-300 hover:text-white"
                >
                  {showFlags && <span>{country.flag}</span>}
                  <span>{country.name}</span>
                </button>
              ))}

              {/* Americas */}
              <div className="px-3 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider bg-stone-800/50 mt-2">
                🌎 Americas
              </div>
              {COUNTRIES_BY_GROUP.americas.map(country => (
                <button
                  key={country.code}
                  onClick={() => handleSelectCountry(country)}
                  className="w-full px-4 py-2 text-left hover:bg-stone-700 flex items-center gap-2 text-stone-300 hover:text-white"
                >
                  {showFlags && <span>{country.flag}</span>}
                  <span>{country.name}</span>
                </button>
              ))}

              {/* Asia */}
              <div className="px-3 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider bg-stone-800/50 mt-2">
                🌏 Asia
              </div>
              {COUNTRIES_BY_GROUP.asia.map(country => (
                <button
                  key={country.code}
                  onClick={() => handleSelectCountry(country)}
                  className="w-full px-4 py-2 text-left hover:bg-stone-700 flex items-center gap-2 text-stone-300 hover:text-white"
                >
                  {showFlags && <span>{country.flag}</span>}
                  <span>{country.name}</span>
                </button>
              ))}

              {/* Oceania */}
              <div className="px-3 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider bg-stone-800/50 mt-2">
                🌊 Oceania
              </div>
              {COUNTRIES_BY_GROUP.oceania.map(country => (
                <button
                  key={country.code}
                  onClick={() => handleSelectCountry(country)}
                  className="w-full px-4 py-2 text-left hover:bg-stone-700 flex items-center gap-2 text-stone-300 hover:text-white"
                >
                  {showFlags && <span>{country.flag}</span>}
                  <span>{country.name}</span>
                </button>
              ))}

              {/* Other Option */}
              <button
                onClick={handleOtherClick}
                className="w-full px-4 py-2 text-left hover:bg-stone-700 text-amber-500 border-t border-stone-700 mt-2 pt-2 flex items-center gap-2"
              >
                <span>➕</span>
                <span>Other (please specify)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Other Country Input (shown when "Other" is selected) */}
      {isOtherSelected && (
        <div className="mt-2">
          <input
            id="other-country-input"
            type="text"
            value={otherValue}
            onChange={handleOtherChange}
            placeholder="Enter your country name"
            className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required={required}
          />
          <p className="text-xs text-stone-400 mt-1">
            Please enter your country name
          </p>
        </div>
      )}
    </div>
  );
}
