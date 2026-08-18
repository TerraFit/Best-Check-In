// src/components/checkin/Step3DietaryRestrictions.tsx
// ✅ i18n: all guest-facing strings via t()
// Dietary option IDs preserved for storage; labels translated

import React from 'react';
import { Check, X } from 'lucide-react';
import { FoodRestrictions } from '../../types/checkin';
import { useTranslation } from '../../i18n';

interface Step3DietaryRestrictionsProps {
  foodRestrictions: FoodRestrictions;
  onRestrictionToggle: (key: string) => void;
  onOtherTextChange: (text: string) => void;
  hasDietaryRestrictions: boolean | null;
  onHasDietaryRestrictionsChange: (value: boolean) => void;
  showRestrictionsPanel: boolean;
  onShowRestrictionsPanelChange: (show: boolean) => void;
  onContinue: () => void;
  onSave: () => void;
  onBack: () => void;
  primaryColor?: string;
}

export function Step3DietaryRestrictions({
  foodRestrictions,
  onRestrictionToggle,
  onOtherTextChange,
  hasDietaryRestrictions,
  onHasDietaryRestrictionsChange,
  showRestrictionsPanel,
  onShowRestrictionsPanelChange,
  onContinue,
  onSave,
  onBack,
  primaryColor = '#f59e0b',
}: Step3DietaryRestrictionsProps) {
  const { t } = useTranslation();

  const dietaryOptions = [
    { id: 'vegetarian', label: t('dietary_vegetarian') },
    { id: 'vegan', label: t('dietary_vegan') },
    { id: 'carnivore', label: t('dietary_carnivore') },
    { id: 'gluten_free', label: t('dietary_gluten_free') },
    { id: 'lactose_free', label: t('dietary_lactose_free') },
    { id: 'nut_allergy', label: t('dietary_nut_allergy') },
    { id: 'shellfish_allergy', label: t('dietary_shellfish') },
    { id: 'diabetic', label: t('dietary_diabetic') },
    { id: 'halal', label: t('dietary_halal') },
    { id: 'kosher', label: t('dietary_kosher') },
  ];
  
  const handleSave = () => {
    const hasSelected = Object.entries(foodRestrictions).some(
      ([key, val]) => val === true && key !== 'other_text'
    );
    if (!hasSelected && !foodRestrictions.other_text) {
      alert(t('checkin_dietary_alert_select'));
      return;
    }
    onSave();
  };

  return (
    <div className="p-10 md:p-16">
      {!showRestrictionsPanel ? (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">{t('checkin_dietary_title')}</h2>
          <p className="text-stone-500 mb-8">{t('checkin_dietary_subtitle')}</p>
          
          <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
            <p className="text-lg font-medium text-stone-800 mb-6">
              {t('checkin_dietary_question')}
            </p>
            <p className="text-sm text-stone-500 mb-6">
              {t('checkin_dietary_help')}
            </p>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => onHasDietaryRestrictionsChange(true)}
                className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all font-medium shadow-sm hover:shadow-md ${
                  hasDietaryRestrictions === true
                    ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-amber-200'
                    : 'border-stone-200 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md'
                }`}
                style={hasDietaryRestrictions === true ? { borderColor: primaryColor } : {}}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Check size={18} className="text-green-600" strokeWidth={2.5} aria-hidden />
                  {t('common_yes')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onHasDietaryRestrictionsChange(false)}
                className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all font-medium shadow-sm hover:shadow-md ${
                  hasDietaryRestrictions === false
                    ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-amber-200'
                    : 'border-stone-200 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md'
                }`}
                style={hasDietaryRestrictions === false ? { borderColor: primaryColor } : {}}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <X size={18} className="text-red-600" strokeWidth={2.5} aria-hidden />
                  {t('common_no')}
                </span>
              </button>
            </div>
          </div>

          <div className="flex gap-4 mt-8 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
            >
              {t('common_back')}
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 py-3 px-6 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {t('common_continue_arrow')}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">{t('checkin_dietary_title')}</h2>
          <p className="text-stone-500 mb-8">{t('checkin_dietary_subtitle')}</p>
          
          <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
            <p className="text-lg font-medium text-stone-800 mb-4">
              {t('checkin_dietary_select')}
            </p>
            <p className="text-sm text-stone-500 mb-6">
              {t('checkin_dietary_select_help')}
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {dietaryOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${
                    foodRestrictions[option.id as keyof FoodRestrictions]
                      ? 'border-amber-500 bg-amber-50 shadow-amber-200'
                      : 'border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                  style={
                    foodRestrictions[option.id as keyof FoodRestrictions]
                      ? { borderColor: primaryColor }
                      : {}
                  }
                >
                  <input
                    type="checkbox"
                    checked={!!foodRestrictions[option.id as keyof FoodRestrictions]}
                    onChange={() => onRestrictionToggle(option.id)}
                    className="w-4 h-4 text-amber-500 rounded border-stone-300 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-stone-700">{option.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('checkin_dietary_note')}
              </label>
              <input
                type="text"
                value={foodRestrictions.other_text || ''}
                onChange={(e) => onOtherTextChange(e.target.value)}
                placeholder={t('checkin_dietary_note_placeholder')}
                className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-sm"
              />
              <p className="text-xs text-stone-400 mt-1">
                {t('checkin_dietary_note_help')}
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-8 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
            >
              {t('common_back')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 px-6 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {t('checkin_dietary_save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
