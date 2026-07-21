// src/components/checkin/Step3_DietaryRestrictions.tsx
import React from 'react';
import { Utensils, Check, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { FoodRestrictions, DIETARY_OPTIONS, DEFAULT_RESTRICTIONS } from '../../types/checkin';

interface Step3DietaryRestrictionsProps {
  foodRestrictions: FoodRestrictions;
  onRestrictionToggle: (key: keyof FoodRestrictions) => void;
  onOtherTextChange: (text: string) => void;
  hasDietaryRestrictions: boolean | null;
  onHasDietaryRestrictionsChange: (value: boolean | null) => void;
  showRestrictionsPanel: boolean;
  onShowRestrictionsPanelChange: (show: boolean) => void;
  onContinue: () => void;
  onSave: () => void;
  onBack: () => void;
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
}: Step3DietaryRestrictionsProps) {
  const { t } = useTranslation();

  const handleContinue = () => {
    if (hasDietaryRestrictions === null) {
      alert('Please select whether you have any dietary restrictions.');
      return;
    }
    if (hasDietaryRestrictions === false) {
      onContinue();
      return;
    }
    onShowRestrictionsPanelChange(true);
  };

  const handleSave = () => {
    const hasSelected = Object.entries(foodRestrictions).some(
      ([key, val]) => val === true && key !== 'other_text'
    );
    if (!hasSelected && !foodRestrictions.other_text) {
      alert('Please select at least one dietary restriction or specify "Other".');
      return;
    }
    onSave();
  };

  const handleBack = () => {
    if (showRestrictionsPanel) {
      onShowRestrictionsPanelChange(false);
      onHasDietaryRestrictionsChange(null);
    } else {
      onBack();
    }
  };

  const hasAnyRestrictions = Object.entries(foodRestrictions).some(
    ([key, val]) => val === true && key !== 'other_text'
  );

  const selectedLabels = Object.entries(foodRestrictions)
    .filter(([key, val]) => val === true && key !== 'other_text')
    .map(([key]) => {
      const option = DIETARY_OPTIONS.find(o => o.key === key);
      return option?.label || key;
    });

  return (
    <div className="p-10 md:p-16 animate-fade-in flex flex-col flex-grow">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Utensils size={32} className="text-amber-600" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-stone-900">Dietary Requirements</h2>
        <p className="text-stone-500 text-sm mt-2">
          Do you have any special dietary requirements or food restrictions?
        </p>
      </div>

      {!showRestrictionsPanel ? (
        // Initial Question: YES / NO
        <div className="flex-grow flex flex-col items-center justify-center gap-6 max-w-md mx-auto w-full">
          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              type="button"
              onClick={() => onHasDietaryRestrictionsChange(false)}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                hasDietaryRestrictions === false
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={24} className="text-green-600" />
              </div>
              <span className="font-bold text-stone-800">No</span>
              <span className="text-xs text-stone-400">No dietary restrictions</span>
            </button>

            <button
              type="button"
              onClick={() => onHasDietaryRestrictionsChange(true)}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                hasDietaryRestrictions === true
                  ? 'border-amber-500 bg-amber-50 shadow-md'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Utensils size={24} className="text-amber-600" />
              </div>
              <span className="font-bold text-stone-800">Yes</span>
              <span className="text-xs text-stone-400">I have restrictions</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-6 px-12 py-4 bg-amber-600 text-white rounded-full font-semibold hover:bg-amber-700 transition-all shadow-md text-sm uppercase tracking-wider"
          >
            Continue
          </button>

          {hasDietaryRestrictions !== null && (
            <p className="text-xs text-stone-400 mt-2">
              {hasDietaryRestrictions === false 
                ? '✓ No restrictions selected. Proceed to indemnity.' 
                : '✓ Please select your restrictions below.'}
            </p>
          )}
        </div>
      ) : (
        // Restrictions Selection Panel
        <div className="flex-grow overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {DIETARY_OPTIONS.map(option => {
              const isSelected = foodRestrictions[option.key] as boolean;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onRestrictionToggle(option.key)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 shadow-md'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-xs font-medium text-center">{option.label}</span>
                  {isSelected && (
                    <span className="text-[10px] text-amber-600 font-bold">✓ Selected</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Other input */}
          <div className="mt-6">
            <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
              <input
                type="checkbox"
                checked={foodRestrictions.other}
                onChange={() => onRestrictionToggle('other')}
                className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500"
              />
              Other (please specify)
            </label>
            {foodRestrictions.other && (
              <input
                type="text"
                value={foodRestrictions.other_text}
                onChange={(e) => onOtherTextChange(e.target.value)}
                placeholder="Please specify your dietary requirement..."
                className="mt-2 w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm"
              />
            )}
          </div>

          {/* Selected summary */}
          <div className="mt-6 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <p className="text-xs font-medium text-stone-500">Selected restrictions:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedLabels.length > 0 ? (
                selectedLabels.map(label => (
                  <span key={label} className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-medium">
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-xs text-stone-400 italic">No restrictions selected</span>
              )}
              {foodRestrictions.other && foodRestrictions.other_text && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-medium">
                  Other: {foodRestrictions.other_text}
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 border border-stone-200 rounded-xl text-stone-600 font-medium hover:bg-stone-50 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-8 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all shadow-md"
            >
              Save & Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
