// src/components/settings/MarketingConsentToggle.tsx
// ✅ PREMIUM MARKETING CONSENT TOGGLE - Based on specification

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface MarketingConsentToggleProps {
  businessId: string;
  initialEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

export default function MarketingConsentToggle({
  businessId,
  initialEnabled = false,
  onToggle,
  className = ''
}: MarketingConsentToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load initial state from database
  useEffect(() => {
    if (businessId) {
      loadSettings();
    }
  }, [businessId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/.netlify/functions/get-business-settings?businessId=${businessId}`);
      if (response.ok) {
        const data = await response.json();
        setEnabled(data.marketing_consent_enabled || false);
      }
    } catch (error) {
      console.error('Error loading marketing consent settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newState: boolean) => {
    try {
      setSaving(true);
      const response = await fetch('/.netlify/functions/update-business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          marketing_consent_enabled: newState
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // Notify parent
      if (onToggle) {
        onToggle(newState);
      }
    } catch (error) {
      console.error('Error saving marketing consent settings:', error);
      // Revert on error
      setEnabled(!newState);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    saveSettings(newState);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 bg-gray-100 rounded-xl ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-[#F2F2F2] border-2 border-[#7A7A7A] rounded-[999px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 ${className}`}
      style={{ minHeight: '120px' }}
    >
      {/* Left: Label */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {enabled ? (
            <div className="p-3 bg-green-100 rounded-full">
              <Check size={32} className="text-green-600" />
            </div>
          ) : (
            <div className="p-3 bg-gray-200 rounded-full">
              <X size={32} className="text-gray-500" />
            </div>
          )}
        </div>
        <div>
          <h3 className="text-3xl md:text-5xl font-bold text-[#444444]">
            Marketing Consents
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {enabled 
              ? '✅ Guests will be asked for marketing consent during check-in' 
              : '⛔ Marketing consent collection is disabled'}
          </p>
        </div>
      </div>

      {/* Right: Toggle Switch */}
      <div 
        className="relative flex-shrink-0 cursor-pointer"
        style={{ width: '480px', maxWidth: '100%', height: '90px' }}
        onClick={handleToggle}
        role="switch"
        aria-checked={enabled}
        aria-label="Marketing Consents"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        {/* Toggle Background */}
        <div 
          className="absolute inset-0 rounded-[999px] transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            background: enabled 
              ? 'linear-gradient(145deg, #22c55e, #16a34a)' 
              : 'linear-gradient(145deg, #d1d5db, #9ca3af)',
            boxShadow: enabled
              ? '0 4px 20px rgba(34, 197, 94, 0.3), inset 0 2px 4px rgba(255,255,255,0.2)'
              : '0 4px 15px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.3)'
          }}
        >
          {/* Inner glow effect */}
          <div 
            className="absolute inset-0 rounded-[999px] pointer-events-none"
            style={{
              background: enabled
                ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 70%)'
            }}
          />
        </div>

        {/* OFF Label (Left side) */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-1/2 flex justify-center items-center">
            <span 
              className="text-4xl md:text-5xl font-bold transition-colors duration-300"
              style={{
                color: enabled ? 'rgba(255,255,255,0.3)' : '#000000'
              }}
            >
              OFF
            </span>
          </div>
          <div className="w-1/2 flex justify-center items-center">
            <span 
              className="text-4xl md:text-5xl font-bold transition-colors duration-300"
              style={{
                color: enabled ? '#ffffff' : 'rgba(0,0,0,0.3)'
              }}
            >
              ON
            </span>
          </div>
        </div>

        {/* Sliding Knob */}
        <div 
          className={`absolute top-1 w-[calc(50%-8px)] h-[calc(100%-8px)] rounded-[999px] transition-all duration-300 ease-in-out shadow-lg flex items-center justify-center`}
          style={{
            left: enabled ? 'calc(50% + 4px)' : '4px',
            background: 'linear-gradient(145deg, #ffffff, #f3f4f6)',
            boxShadow: enabled
              ? '0 2px 12px rgba(34, 197, 94, 0.3), inset 0 -2px 4px rgba(0,0,0,0.05)'
              : '0 2px 12px rgba(0,0,0,0.15), inset 0 -2px 4px rgba(0,0,0,0.05)'
          }}
        >
          {/* Knob inner gloss */}
          <div 
            className="absolute inset-0 rounded-[999px] pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.6) 0%, transparent 70%)'
            }}
          />
          
          {/* Knob Icon */}
          {enabled ? (
            <Check size={32} className="text-green-600 relative z-10" />
          ) : (
            <X size={32} className="text-gray-400 relative z-10" />
          )}
        </div>

        {/* Disabled overlay when saving */}
        {saving && (
          <div className="absolute inset-0 rounded-[999px] bg-black/10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
}
