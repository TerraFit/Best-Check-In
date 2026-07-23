// src/components/checkin/Step2PersonalDetails.tsx
// ✅ FIXED: Remove nested form, keep native submit flow

import React from 'react';
import { CheckInFormData, TouchedFields } from '../../types/checkin';
import { COUNTRIES } from '../../constants';
import { getRegionsForCountry, getRegionTypeLabel } from '../../services/countryRegionService';
import { cleanLocation } from '../../services/locationIntelligenceService';

interface Step2PersonalDetailsProps {
  formData: CheckInFormData;
  onFormChange: (field: string, value: any) => void;
  touched: TouchedFields;
  onTouched: (field: keyof TouchedFields) => void;
  submitAttempted: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onError: (errors: string[]) => void;
  getErrorClass: (field: keyof TouchedFields, validationPassed: boolean) => string;
  ErrorMessage: React.ComponentType<{ field: string; message: string }>;
  primaryColor?: string;
  secondaryColor?: string;
}

export function Step2PersonalDetails({
  formData,
  onFormChange,
  touched,
  onTouched,
  submitAttempted,
  onBack,
  onSubmit,
  onError,
  getErrorClass,
  ErrorMessage,
  primaryColor = '#f59e0b',
  secondaryColor = '#1e1e1e',
}: Step2PersonalDetailsProps) {
  const availableRegions = formData.country ? getRegionsForCountry(formData.country) : null;
  const regionTypeLabel = formData.country ? getRegionTypeLabel(formData.country) : 'Province / State';

  const provinceOptions = React.useMemo(() => {
    if (availableRegions && availableRegions.length > 0) {
      return [
        { value: '', label: `Select ${regionTypeLabel}` },
        ...availableRegions.map(region => ({ value: region, label: region }))
      ];
    }
    return [
      { value: '', label: `Enter ${regionTypeLabel}` }
    ];
  }, [availableRegions, regionTypeLabel]);

  const referrals = [
    { value: '', label: 'Select Referral Source' },
    { value: 'Word of Mouth', label: 'Word of Mouth' },
    { value: 'Booking.com', label: 'Booking.com' },
    { value: 'Airbnb', label: 'Airbnb' },
    { value: 'Agoda', label: 'Agoda' },
    { value: 'Expedia', label: 'Expedia' },
    { value: 'Google', label: 'Google' },
    { value: 'Facebook / Instagram', label: 'Facebook / Instagram' },
    { value: 'Travel Agency', label: 'Travel Agency' },
    { value: 'LinkedIn', label: 'LinkedIn' },
    { value: 'YouTube', label: 'YouTube' },
    { value: 'Research Engine', label: 'Research Engine' },
    { value: 'TikTok', label: 'TikTok' },
    { value: 'Walk-in', label: 'Walk-in' },
    { value: 'Other', label: 'Other' },
  ];

  const settlements = [
    { value: '', label: 'Select Settlement Method' },
    { value: 'cash', label: 'Cash' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'mobile_payment', label: 'Mobile Payment' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'voucher', label: 'Voucher' },
    { value: 'other', label: 'Other' },
  ];

  const handleFieldChange = (field: string, value: any) => {
    if (field === 'arrivingFrom' || field === 'nextDestination') {
      value = cleanLocation(value);
    }
    console.log(`🔍 Step2PersonalDetails: Changing ${field} to`, value);
    onFormChange(field, value);
    if (field !== 'email') {
      onTouched(field as keyof TouchedFields);
    }
  };

  const getValidation = (field: keyof TouchedFields, value: any): boolean => {
    if (field === 'firstName' || field === 'lastName' || field === 'city' || 
        field === 'arrivingFrom' || field === 'nextDestination') {
      return value && value.trim().length > 0;
    }
    if (field === 'phone') {
      return value && value.trim().length >= 10;
    }
    if (field === 'passportOrId') {
      return value && value.trim().length >= 3;
    }
    if (field === 'country' || field === 'province' || field === 'referral' || field === 'settlement') {
      return value && value !== '';
    }
    if (field === 'arrivalDate') {
      return value && value !== '';
    }
    if (field === 'nights') {
      return value && value >= 1;
    }
    return true;
  };

  return (
    <div className="p-10 md:p-16 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Personal Details</h2>
        <p className="text-stone-500 mb-8">Please provide your personal information for check-in</p>

        {/* ✅ REMOVED <form> - using div instead, button is type="submit" to trigger parent form */}
        <div className="space-y-6">
          {/* Row: First Name + Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                onBlur={() => onTouched('firstName')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('firstName', getValidation('firstName', formData.firstName))}`}
                placeholder="John"
              />
              <ErrorMessage 
                field="firstName" 
                message={submitAttempted && touched.firstName && !getValidation('firstName', formData.firstName) ? 'First name is required' : ''} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                onBlur={() => onTouched('lastName')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('lastName', getValidation('lastName', formData.lastName))}`}
                placeholder="Doe"
              />
              <ErrorMessage 
                field="lastName" 
                message={submitAttempted && touched.lastName && !getValidation('lastName', formData.lastName) ? 'Last name is required' : ''} 
              />
            </div>
          </div>

          {/* Row: Passport/ID + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Passport / ID Number *
              </label>
              <input
                type="text"
                value={formData.passportOrId || ''}
                onChange={(e) => handleFieldChange('passportOrId', e.target.value)}
                onBlur={() => onTouched('passportOrId')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('passportOrId', getValidation('passportOrId', formData.passportOrId))}`}
                placeholder="A1234567"
              />
              <ErrorMessage 
                field="passportOrId" 
                message={submitAttempted && touched.passportOrId && !getValidation('passportOrId', formData.passportOrId) ? 'Passport/ID is required' : ''} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                onBlur={() => onTouched('phone')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('phone', getValidation('phone', formData.phone))}`}
                placeholder="+27 82 123 4567"
              />
              <ErrorMessage 
                field="phone" 
                message={submitAttempted && touched.phone && !getValidation('phone', formData.phone) ? 'Valid phone number is required' : ''} 
              />
            </div>
          </div>

          {/* Row: Country + Province */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Country *
              </label>
              <select
                value={formData.country || ''}
                onChange={(e) => {
                  handleFieldChange('country', e.target.value);
                  handleFieldChange('province', '');
                }}
                onBlur={() => onTouched('country')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('country', getValidation('country', formData.country))}`}
              >
                <option value="">Select Country</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ErrorMessage 
                field="country" 
                message={submitAttempted && touched.country && !getValidation('country', formData.country) ? 'Country is required' : ''} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {regionTypeLabel} *
              </label>
              {availableRegions && availableRegions.length > 0 ? (
                <select
                  value={formData.province || ''}
                  onChange={(e) => handleFieldChange('province', e.target.value)}
                  onBlur={() => onTouched('province')}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('province', getValidation('province', formData.province))}`}
                  disabled={!formData.country}
                >
                  {provinceOptions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.province || ''}
                  onChange={(e) => handleFieldChange('province', e.target.value)}
                  onBlur={() => onTouched('province')}
                  placeholder={`Enter ${regionTypeLabel}`}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('province', getValidation('province', formData.province))}`}
                  disabled={!formData.country}
                />
              )}
              <ErrorMessage 
                field="province" 
                message={submitAttempted && touched.province && !getValidation('province', formData.province) ? `${regionTypeLabel} is required` : ''} 
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              City / Town *
            </label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              onBlur={() => onTouched('city')}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('city', getValidation('city', formData.city))}`}
              placeholder="Cape Town"
            />
            <ErrorMessage 
              field="city" 
              message={submitAttempted && touched.city && !getValidation('city', formData.city) ? 'City is required' : ''} 
            />
          </div>

          {/* Arriving From + Next Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Arriving From *
              </label>
              <input
                type="text" 
                placeholder="Where did you sleep last night? (e.g., Johannesburg, Cape Town, Gaborone)"
                className={`w-full px-4 py-3 rounded-lg border transition-colors uppercase ${getErrorClass('arrivingFrom', getValidation('arrivingFrom', formData.arrivingFrom))}`}
                value={formData.arrivingFrom} 
                onFocus={() => onTouched('arrivingFrom')}
                onChange={(e) => {
                  const cleaned = cleanLocation(e.target.value);
                  handleFieldChange('arrivingFrom', cleaned);
                }}
              />
              <p className="text-xs text-stone-400 mt-1">
                🏨 Tell us the last city/town where you stayed before arriving here
              </p>
              <ErrorMessage 
                field="arrivingFrom" 
                message={submitAttempted && touched.arrivingFrom && !getValidation('arrivingFrom', formData.arrivingFrom) ? 'Please tell us your last location before arriving' : ''} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Next Destination *
              </label>
              <input
                type="text" 
                placeholder="Where are you heading after your stay? (e.g., Johannesburg, Cape Town, Gaborone)"
                className={`w-full px-4 py-3 rounded-lg border transition-colors uppercase ${getErrorClass('nextDestination', getValidation('nextDestination', formData.nextDestination))}`}
                value={formData.nextDestination} 
                onFocus={() => onTouched('nextDestination')}
                onChange={(e) => {
                  const cleaned = cleanLocation(e.target.value);
                  handleFieldChange('nextDestination', cleaned);
                }}
              />
              <p className="text-xs text-stone-400 mt-1">
                🚗 Tell us where you're headed after your stay with us
              </p>
              <ErrorMessage 
                field="nextDestination" 
                message={submitAttempted && touched.nextDestination && !getValidation('nextDestination', formData.nextDestination) ? 'Please tell us your next destination' : ''} 
              />
            </div>
          </div>

          {/* Arrival Date + Nights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Arrival Date *
              </label>
              <input
                type="date"
                value={formData.arrivalDate || ''}
                onChange={(e) => handleFieldChange('arrivalDate', e.target.value)}
                onBlur={() => onTouched('arrivalDate')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('arrivalDate', getValidation('arrivalDate', formData.arrivalDate))}`}
              />
              <ErrorMessage 
                field="arrivalDate" 
                message={submitAttempted && touched.arrivalDate && !getValidation('arrivalDate', formData.arrivalDate) ? 'Arrival date is required' : ''} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Nights *
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.nights || 1}
                onChange={(e) => handleFieldChange('nights', parseInt(e.target.value) || 1)}
                onBlur={() => onTouched('nights')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('nights', getValidation('nights', formData.nights))}`}
                placeholder="1"
              />
              <ErrorMessage 
                field="nights" 
                message={submitAttempted && touched.nights && !getValidation('nights', formData.nights) ? 'Nights must be at least 1' : ''} 
              />
            </div>
          </div>

          {/* Adults + Kids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Adults
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.adults || 1}
                onChange={(e) => handleFieldChange('adults', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Kids
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.kids || 0}
                onChange={(e) => handleFieldChange('kids', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          {/* Referral Source */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Referral Source *
            </label>
            <select
              value={formData.referral || ''}
              onChange={(e) => handleFieldChange('referral', e.target.value)}
              onBlur={() => onTouched('referral')}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('referral', getValidation('referral', formData.referral))}`}
            >
              {referrals.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ErrorMessage 
              field="referral" 
              message={submitAttempted && touched.referral && !getValidation('referral', formData.referral) ? 'Referral source is required' : ''} 
            />
          </div>

          {/* Settlement Method */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Settlement Method *
            </label>
            <select
              value={formData.settlement || ''}
              onChange={(e) => handleFieldChange('settlement', e.target.value)}
              onBlur={() => onTouched('settlement')}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('settlement', getValidation('settlement', formData.settlement))}`}
            >
              {settlements.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ErrorMessage 
              field="settlement" 
              message={submitAttempted && touched.settlement && !getValidation('settlement', formData.settlement) ? 'Settlement method is required' : ''} 
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-stone-200">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium order-2 sm:order-1"
            >
              ← Back
            </button>
            <button
              type="submit"  // ✅ Native submit - triggers parent form
              className="px-6 py-3 text-white font-medium rounded-lg transition-colors shadow-sm order-1 sm:order-2 flex-1 hover:opacity-90"
              style={{ backgroundColor: primaryColor || '#f59e0b' }}
            >
              Continue to Dietary Options →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
