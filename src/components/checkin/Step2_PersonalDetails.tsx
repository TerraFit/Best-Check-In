// src/components/checkin/Step2PersonalDetails.tsx
// ✅ Country + province updated in one call; parent uses functional setFormData

import React from 'react';
import { CheckInFormData, TouchedFields } from '../../types/checkin';
import { COUNTRIES } from '../../constants';
import { getRegionsForCountry, getRegionTypeLabel } from '../../services/countryRegionService';
import { LocationAutocomplete } from './LocationAutocomplete';
import { useTranslation } from '../../i18n';

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
  const { t } = useTranslation();
  const availableRegions = formData.country ? getRegionsForCountry(formData.country) : null;
  const regionTypeLabel = formData.country ? getRegionTypeLabel(formData.country) : t('checkin_province');

  const provinceOptions = React.useMemo(() => {
    if (availableRegions && availableRegions.length > 0) {
      return [
        { value: '', label: t('checkin_select_region', { field: regionTypeLabel }) },
        ...availableRegions.map(region => ({ value: region, label: region }))
      ];
    }
    return [
      { value: '', label: t('checkin_enter_region', { field: regionTypeLabel }) }
    ];
  }, [availableRegions, regionTypeLabel, t]);

  const referrals = [
    { value: '', label: t('checkin_select_referral') },
    { value: 'Word of Mouth', label: t('checkin_referral_word_of_mouth') },
    { value: 'Booking.com', label: t('checkin_referral_booking') },
    { value: 'Airbnb', label: t('checkin_referral_airbnb') },
    { value: 'Agoda', label: t('checkin_referral_agoda') },
    { value: 'Expedia', label: t('checkin_referral_expedia') },
    { value: 'Google', label: t('checkin_referral_google') },
    { value: 'Facebook / Instagram', label: t('checkin_referral_social') },
    { value: 'Travel Agency', label: t('checkin_referral_travel_agency') },
    { value: 'LinkedIn', label: t('checkin_referral_linkedin') },
    { value: 'YouTube', label: t('checkin_referral_youtube') },
    { value: 'Research Engine', label: t('checkin_referral_research') },
    { value: 'TikTok', label: t('checkin_referral_tiktok') },
    { value: 'Walk-in', label: t('checkin_referral_walkin') },
    { value: 'Other', label: t('checkin_referral_other') },
  ];

  const settlements = [
    { value: '', label: t('checkin_select_settlement') },
    { value: 'cash', label: t('checkin_settlement_cash') },
    { value: 'credit_card', label: t('checkin_settlement_credit_card') },
    { value: 'debit_card', label: t('checkin_settlement_debit_card') },
    { value: 'mobile_payment', label: t('checkin_settlement_mobile') },
    { value: 'bank_transfer', label: t('checkin_settlement_bank') },
    { value: 'voucher', label: t('checkin_settlement_voucher') },
    { value: 'other', label: t('checkin_settlement_other') },
  ];

  const handleFieldChange = (field: string, value: any) => {
    onFormChange(field, value);
    if (field !== 'email') {
      onTouched(field as keyof TouchedFields);
    }
  };

  const handleCountryChange = (country: string) => {
    onFormChange('country', country);
    onFormChange('province', '');
    onTouched('country');
    onTouched('province');
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
        <h2 className="text-2xl font-bold text-stone-900 mb-2">{t('checkin_personal_details')}</h2>
        <p className="text-stone-500 mb-8">{t('checkin_personal_subtitle')}</p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('checkin_first_name')} *
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
                message={submitAttempted && touched.firstName && !getValidation('firstName', formData.firstName) ? t('error_first_name_required') : ''} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('checkin_last_name')} *
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
                message={submitAttempted && touched.lastName && !getValidation('lastName', formData.lastName) ? t('error_last_name_required') : ''} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('checkin_passport')} *
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
                message={submitAttempted && touched.passportOrId && !getValidation('passportOrId', formData.passportOrId) ? t('error_passport_required') : ''} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('checkin_phone')} *
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                onBlur={() => onTouched('phone')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('phone', getValidation('phone', formData.phone))}`}
                placeholder={t('checkin_phone_placeholder')}
              />
              <ErrorMessage 
                field="phone" 
                message={submitAttempted && touched.phone && !getValidation('phone', formData.phone) ? t('error_phone_invalid') : ''} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('checkin_country')} *
              </label>
              <select
                value={formData.country || ''}
                onChange={(e) => handleCountryChange(e.target.value)}
                onBlur={() => onTouched('country')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('country', getValidation('country', formData.country))}`}
              >
                <option value="">{t('checkin_select_country')}</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ErrorMessage 
                field="country" 
                message={submitAttempted && touched.country && !getValidation('country', formData.country) ? t('error_country_required') : ''} 
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
                  placeholder={t('checkin_enter_region', { field: regionTypeLabel })}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${getErrorClass('province', getValidation('province', formData.province))}`}
                  disabled={!formData.country}
                />
              )}
              <ErrorMessage 
                field="province" 
                message={submitAttempted && touched.province && !getValidation('province', formData.province) ? t('error_province_required', { field: regionTypeLabel }) : ''} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('checkin_city')} *
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
              message={submitAttempted && touched.city && !getValidation('city', formData.city) ? t('error_city_required') : ''} 
            />
          </div>

          <div className="col-span-full">
            <LocationAutocomplete
              value={formData.arrivingFrom}
              onChange={(value) => {
                handleFieldChange('arrivingFrom', value);
              }}
              onBlur={() => {}}
              country={formData.country}
              placeholder={t('checkin_arriving_from_placeholder')}
              label={t('checkin_arriving_from')}
              required={true}
              error={submitAttempted && touched.arrivingFrom && !getValidation('arrivingFrom', formData.arrivingFrom) ? t('error_arriving_from_detail') : ''}
              touched={touched.arrivingFrom}
            />
            <p className="text-xs text-stone-400 mt-1">
              {t('checkin_arriving_from_hint')}
            </p>
          </div>

          <div className="col-span-full">
            <LocationAutocomplete
              value={formData.nextDestination}
              onChange={(value) => {
                handleFieldChange('nextDestination', value);
              }}
              onBlur={() => {}}
              country={formData.country}
              placeholder={t('checkin_next_destination_placeholder')}
              label={t('checkin_next_destination')}
              required={true}
              error={submitAttempted && touched.nextDestination && !getValidation('nextDestination', formData.nextDestination) ? t('error_next_destination_detail') : ''}
              touched={touched.nextDestination}
            />
            <p className="text-xs text-stone-400 mt-1">
              {t('checkin_next_destination_hint')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('checkin_arrival_date')} *
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
                message={submitAttempted && touched.arrivalDate && !getValidation('arrivalDate', formData.arrivalDate) ? t('error_arrival_date_required') : ''} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('checkin_nights')} *
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
                message={submitAttempted && touched.nights && !getValidation('nights', formData.nights) ? t('error_nights_min') : ''} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('checkin_adults')}
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
                {t('checkin_kids')}
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

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('checkin_referral_source')} *
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
              message={submitAttempted && touched.referral && !getValidation('referral', formData.referral) ? t('error_referral_source_required') : ''} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('checkin_settlement_method')} *
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
              message={submitAttempted && touched.settlement && !getValidation('settlement', formData.settlement) ? t('error_settlement_method_required') : ''} 
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-stone-200">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium order-2 sm:order-1"
            >
              {t('common_back')}
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-white font-medium rounded-lg transition-colors shadow-sm order-1 sm:order-2 flex-1 hover:opacity-90"
              style={{ backgroundColor: primaryColor || '#f59e0b' }}
            >
              {t('checkin_continue_dietary')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
