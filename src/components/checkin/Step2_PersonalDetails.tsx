// src/components/checkin/Step2_PersonalDetails.tsx
// ✅ FIXED: Unterminated string literal

import React from 'react';
import { useTranslation } from '../../i18n';
import { COUNTRIES, SETTLEMENT_METHODS } from '../../constants';
import { getRegionsForCountry, getRegionTypeLabel } from '../../services/countryRegionService';
import { cleanLocation } from '../../utils/checkinHelpers';

interface Step2PersonalDetailsProps {
  formData: any;
  onFormChange: (field: string, value: any) => void;
  touched: any;
  onTouched: (field: string) => void;
  submitAttempted: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onError: (errors: string[]) => void;
  getErrorClass: (field: string, isValid: boolean) => string;
  ErrorMessage: React.FC<{ field: string; message: string }>;
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
  getErrorClass,
  ErrorMessage,
  secondaryColor = '#1e1e1e',
}: Step2PersonalDetailsProps) {
  const { t } = useTranslation();

  const availableRegions = formData.country ? getRegionsForCountry(formData.country) : null;
  const regionTypeLabel = formData.country ? getRegionTypeLabel(formData.country) : 'Region';

  const validateStep = (): string[] => {
    const errors: string[] = [];
    if (!formData.firstName.trim()) errors.push(t('checkin_first_name'));
    if (!formData.lastName.trim()) errors.push(t('checkin_last_name'));
    if (!formData.passportOrId.trim()) errors.push(t('checkin_passport'));
    if (!formData.phone.trim()) errors.push(t('checkin_phone'));
    if (!formData.country) errors.push(t('checkin_country'));
    if (!formData.province) errors.push(regionTypeLabel);
    if (!formData.city.trim()) errors.push(t('checkin_city'));
    if (!formData.arrivingFrom.trim()) errors.push('Arriving From');
    if (!formData.arrivalDate) errors.push(t('checkin_arrival_date'));
    if (!formData.nights || formData.nights < 1) errors.push(t('checkin_nights'));
    if (!formData.referral) errors.push(t('checkin_referral'));
    if (!formData.nextDestination.trim()) errors.push(t('checkin_next_destination'));
    if (!formData.settlement) errors.push(t('checkin_settlement'));
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateStep();
    if (errors.length > 0) {
      const fields = ['firstName', 'lastName', 'passportOrId', 'phone', 'country', 'province', 'city', 'arrivalDate', 'nights', 'referral', 'arrivingFrom', 'nextDestination', 'settlement'];
      fields.forEach(f => onTouched(f));
      onError(errors);
      return;
    }
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="p-10 md:p-16 animate-fade-in flex-grow overflow-y-auto">
      <div className="border-b border-stone-100 pb-8 mb-10">
        <h2 className="text-3xl font-serif font-bold text-stone-900">{t('checkin_personal_details')}</h2>
        <p className="text-stone-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">{t('checkin_immigration_act')}</p>
        <p className="text-red-500 text-xs mt-2">* {t('error_all_required')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        {/* First Name and Last Name */}
        <div className="grid grid-cols-2 gap-6 col-span-full">
          <div className="space-y-1 group">
            <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
              {t('checkin_first_name')} <span className="text-red-500">*</span>
            </label>
            <input 
              required 
              type="text" 
              className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('firstName', !!formData.firstName.trim())}`}
              value={formData.firstName} 
              onFocus={() => onTouched('firstName')}
              onChange={e => onFormChange('firstName', e.target.value)} 
            />
            <ErrorMessage field="firstName" message={t('error_first_name_required')} />
          </div>
          
          <div className="space-y-1 group">
            <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
              {t('checkin_last_name')} <span className="text-red-500">*</span>
            </label>
            <input 
              required 
              type="text" 
              className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('lastName', !!formData.lastName.trim())}`}
              value={formData.lastName} 
              onFocus={() => onTouched('lastName')}
              onChange={e => onFormChange('lastName', e.target.value)} 
            />
            <ErrorMessage field="lastName" message={t('error_last_name_required')} />
          </div>
        </div>

        {/* Passport/ID */}
        <div className="space-y-1 group">
          <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
            {t('checkin_passport')} <span className="text-red-500">*</span>
          </label>
          <input 
            required 
            type="text" 
            className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-mono transition-colors ${getErrorClass('passportOrId', !!formData.passportOrId.trim())}`} 
            value={formData.passportOrId} 
            onFocus={() => onTouched('passportOrId')}
            onChange={e => onFormChange('passportOrId', e.target.value)} 
          />
          <ErrorMessage field="passportOrId" message={t('error_passport_required')} />
        </div>
        
        {/* Phone */}
        <div className="space-y-1 group">
          <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
            {t('checkin_phone')} <span className="text-red-500">*</span>
          </label>
          <input 
            required 
            type="tel" 
            className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg transition-colors ${getErrorClass('phone', !!formData.phone.trim())}`} 
            value={formData.phone} 
            onFocus={() => onTouched('phone')}
            onChange={e => onFormChange('phone', e.target.value)} 
          />
          <ErrorMessage field="phone" message={t('error_phone_required')} />
        </div>
        
        {/* Country */}
        <div className="space-y-1 group">
          <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
            {t('checkin_country')} <span className="text-red-500">*</span>
          </label>
          <select 
            required 
            className={`w-full border-b py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('country', !!formData.country)}`}
            value={formData.country} 
            onFocus={() => onTouched('country')}
            onChange={e => {
              onFormChange('country', e.target.value);
              onFormChange('province', '');
            }}
          >
            <option value="">{t('checkin_select_country')}</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ErrorMessage field="country" message={t('error_country_required')} />
        </div>

        {/* Province/Region */}
        <div className={`space-y-1 group transition-all duration-300 ${formData.country ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
          <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
            {regionTypeLabel} <span className="text-red-500">*</span>
          </label>
          {availableRegions && availableRegions.length > 0 ? (
            <select 
              required 
              className={`w-full border-b py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('province', !!formData.province)}`}
              value={formData.province} 
              onFocus={() => onTouched('province')}
              onChange={e => onFormChange('province', e.target.value)}
              disabled={!formData.country}
            >
              <option value="">{t('checkin_select_province')}</option>
              {availableRegions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          ) : (
            <input 
              required 
              type="text" 
              placeholder={`${t('checkin_enter_province')}`}
              className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('province', !!formData.province)}`}
              value={formData.province} 
              onFocus={() => onTouched('province')}
              onChange={e => onFormChange('province', e.target.value)} 
              disabled={!formData.country}
            />
          )}
          <ErrorMessage field="province" message={`${regionTypeLabel} ${t('error_is_required')}`} />
        </div>

        {/* City */}
        <div className="space-y-1 group">
          <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
            {t('checkin_city')} <span className="text-red-500">*</span>
          </label>
          <input 
            required 
            type="text" 
            className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('city', !!formData.city.trim())}`} 
            value={formData.city} 
            onFocus={() => onTouched('city')}
            onChange={e => onFormChange('city', e.target.value)} 
          />
          <ErrorMessage field="city" message={t('error_city_required')} />
        </div>

        {/* Arriving From */}
        <div className="space-y-1 group col-span-full">
          <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
            Arriving From <span className="text-red-500">*</span>
          </label>
          <input 
            required 
            type="text" 
            placeholder="Where did you sleep last night? (e.g., Johannesburg, Cape Town, Gaborone)"
            className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg italic transition-colors uppercase ${getErrorClass('arrivingFrom', !!formData.arrivingFrom.trim())}`}
            value={formData.arrivingFrom} 
            onFocus={() => onTouched('arrivingFrom')}
            onChange={e => onFormChange('arrivingFrom', cleanLocation(e.target.value))} 
          />
          <p className="text-xs text-stone-400">🏨 Tell us the last city/town where you stayed before arriving here</p>
          <ErrorMessage field="arrivingFrom" message="Please tell us your last location before arriving" />
        </div>

        {/* Stay Details */}
        <div className="grid grid-cols-2 gap-8 col-span-full bg-stone-50 p-8 rounded-3xl border border-stone-200">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('checkin_adults')}</label>
            <input required type="number" min="1" className="w-full bg-transparent border-b border-stone-300 py-2 font-bold" value={formData.adults} onChange={e => onFormChange('adults', parseInt(e.target.value))} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('checkin_children')}</label>
            <input required type="number" min="0" className="w-full bg-transparent border-b border-stone-300 py-2 font-bold" value={formData.kids} onChange={e => onFormChange('kids', parseInt(e.target.value))} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('checkin_arrival_date')} <span className="text-red-500">*</span></label>
            <input 
              required 
              type="date" 
              className={`w-full bg-transparent border-b py-2 font-bold transition-colors ${getErrorClass('arrivalDate', !!formData.arrivalDate)}`}
              value={formData.arrivalDate} 
              onFocus={() => onTouched('arrivalDate')}
              onChange={e => onFormChange('arrivalDate', e.target.value)} 
            />
            <ErrorMessage field="arrivalDate" message={t('error_arrival_date_required')} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('checkin_nights')} <span className="text-red-500">*</span></label>
            <input 
              required 
              type="number" 
              min="1" 
              className={`w-full bg-transparent border-b py-2 font-bold transition-colors ${getErrorClass('nights', formData.nights >= 1)}`}
              value={formData.nights} 
              onFocus={() => onTouched('nights')}
              onChange={e => onFormChange('nights', parseInt(e.target.value))} 
            />
            <ErrorMessage field="nights" message={t('error_nights_required')} />
          </div>
        </div>

        {/* Referral Source */}
        <div className="space-y-1 group col-span-full">
          <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
            {t('checkin_referral')} <span className="text-red-500">*</span>
          </label>
          <select 
            required
            value={formData.referral}
            onFocus={() => onTouched('referral')}
            onChange={e => onFormChange('referral', e.target.value)}
            className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('referral', !!formData.referral)}`}
          >
            <option value="">{t('checkin_select_referral')}</option>
            <option value="Word of mouth">{t('checkin_referral_word_of_mouth')}</option>
            <option value="Booking.com">Booking.com</option>
            <option value="Google">Google</option>
            <option value="Facebook / Instagram">Facebook / Instagram</option>
            <option value="Travel Agency">{t('checkin_referral_travel_agency')}</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="Research engine">{t('checkin_referral_research')}</option>
            <option value="TikTok">TikTok</option>
          </select>
          <ErrorMessage field="referral" message={t('error_referral_required')} />
        </div>

        {/* Next Destination */}
        <div className="space-y-1 group col-span-full">
          <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
            {t('checkin_next_destination')} <span className="text-red-500">*</span>
          </label>
          <input 
            required 
            type="text" 
            placeholder={t('checkin_next_destination_placeholder')}
            className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg italic transition-colors uppercase ${getErrorClass('nextDestination', !!formData.nextDestination.trim())}`}
            value={formData.nextDestination} 
            onFocus={() => onTouched('nextDestination')}
            onChange={e => onFormChange('nextDestination', cleanLocation(e.target.value))} 
          />
          <ErrorMessage field="nextDestination" message={t('error_next_destination_required')} />
        </div>
        
        {/* Settlement Method */}
        <div className="space-y-1 group col-span-full">
          <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
            {t('checkin_settlement')} <span className="text-red-500">*</span>
          </label>
          <select 
            required 
            className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('settlement', !!formData.settlement)}`}
            value={formData.settlement} 
            onFocus={() => onTouched('settlement')}
            onChange={e => onFormChange('settlement', e.target.value)}
          >
            <option value="">{t('checkin_select_settlement')}</option>
            {SETTLEMENT_METHODS.filter(m => formData.country === 'South Africa' || m !== 'Instant EFT (RSA resident only)').map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ErrorMessage field="settlement" message={t('error_settlement_required')} />
        </div>
      </div>

      <div className="mt-16 flex justify-between">
        <button type="button" onClick={onBack} className="text-stone-400 font-bold hover:text-stone-800 uppercase text-[10px] tracking-widest">{t('common_back')}</button>
        <button 
          type="submit" 
          className="text-white px-12 py-5 rounded-full font-bold hover:opacity-90 transition-all shadow-xl text-[10px] uppercase tracking-widest"
          style={{ backgroundColor: secondaryColor }}
        >
          Continue to Dietary Options →
        </button>
      </div>
    </form>
  );
}
