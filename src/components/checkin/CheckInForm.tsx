// src/components/checkin/Step3DietaryRestrictions.tsx
// ✅ FIXED: Remove ALL references to setStep - use props only

import React from 'react';
import { FoodRestrictions } from '../../types/checkin';

interface Step3DietaryRestrictionsProps {
  foodRestrictions: FoodRestrictions;
  onRestrictionToggle: (key: string) => void;
  onOtherTextChange: (text: string) => void;
  hasDietaryRestrictions: boolean | null;
  onHasDietaryRestrictionsChange: (value: boolean) => void;
  showRestrictionsPanel: boolean;
  onShowRestrictionsPanelChange: (show: boolean) => void;
  onContinue: () => void;
  onSave: () => void;  // ✅ This is the callback - parent handles setStep
  onBack: () => void;
  primaryColor?: string;
}

const RESTRICTION_OPTIONS = [
  { key: 'vegetarian', label: '🥬 Vegetarian' },
  { key: 'vegan', label: '🌱 Vegan' },
  { key: 'gluten_free', label: '🌾 Gluten Free' },
  { key: 'lactose_free', label: '🥛 Lactose Free' },
  { key: 'nut_allergy', label: '🥜 Nut Allergy' },
  { key: 'shellfish_allergy', label: '🦐 Shellfish Allergy' },
  { key: 'diabetic', label: '💉 Diabetic' },
  { key: 'halal', label: '☪️ Halal' },
  { key: 'kosher', label: '✡️ Kosher' },
];

export function Step3DietaryRestrictions({
  foodRestrictions,
  onRestrictionToggle,
  onOtherTextChange,
  hasDietaryRestrictions,
  onHasDietaryRestrictionsChange,
  showRestrictionsPanel,
  onShowRestrictionsPanelChange,
  onContinue,
  onSave,  // ✅ This comes from parent
  onBack,
  primaryColor = '#f59e0b',
}: Step3DietaryRestrictionsProps) {
  
  // ✅ FIX: This function ONLY calls onSave - NO setStep here!
  const handleSave = () => {
    console.log('🔍 Step3: handleSave called');
    
    const hasSelected = Object.entries(foodRestrictions).some(
      ([key, val]) => val === true && key !== 'other_text'
    );
    
    // Check if any restrictions are selected OR there's a note
    if (!hasSelected && !foodRestrictions.other_text?.trim()) {
      alert('Please select at least one dietary restriction or add a note.');
      return;
    }
    
    console.log('🔍 Step3: Validation passed, calling onSave');
    // ✅ Only call the callback - parent handles state changes
    onSave();
  };

  return (
    <div className="p-10 md:p-16 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Dietary Preferences</h2>
        <p className="text-stone-500 mb-8">Let us know about any dietary requirements</p>

        {!showRestrictionsPanel ? (
          // Initial question: Do you have dietary restrictions?
          <div className="space-y-8">
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
              <p className="text-lg font-medium text-stone-800 mb-4">
                Do you have any dietary restrictions?
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    console.log('🔍 Step3: Selected YES');
                    onHasDietaryRestrictionsChange(true);
                  }}
                  className={`flex-1 px-6 py-4 rounded-xl border-2 transition-all font-medium ${
                    hasDietaryRestrictions === true
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                  style={hasDietaryRestrictions === true ? { borderColor: primaryColor } : {}}
                >
                  ✅ Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    console.log('🔍 Step3: Selected NO');
                    onHasDietaryRestrictionsChange(false);
                  }}
                  className={`flex-1 px-6 py-4 rounded-xl border-2 transition-all font-medium ${
                    hasDietaryRestrictions === false
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                  style={hasDietaryRestrictions === false ? { borderColor: primaryColor } : {}}
                >
                  ❌ No
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium order-2 sm:order-1"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={onContinue}
                className="px-6 py-3 text-white font-medium rounded-lg transition-colors shadow-sm order-1 sm:order-2 flex-1 hover:opacity-90"
                style={{ backgroundColor: primaryColor || '#f59e0b' }}
              >
                Continue →
              </button>
            </div>
          </div>
        ) : (
          // Restrictions panel
          <div className="space-y-8">
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
              <p className="text-lg font-medium text-stone-800 mb-4">
                Select your dietary restrictions
              </p>
              <p className="text-sm text-stone-500 mb-6">
                Select all that apply, or add a note below
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RESTRICTION_OPTIONS.map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      foodRestrictions[key as keyof FoodRestrictions]
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                    style={
                      foodRestrictions[key as keyof FoodRestrictions]
                        ? { borderColor: primaryColor }
                        : {}
                    }
                  >
                    <input
                      type="checkbox"
                      checked={!!foodRestrictions[key as keyof FoodRestrictions]}
                      onChange={() => onRestrictionToggle(key)}
                      className="w-4 h-4 text-amber-500 rounded border-stone-300 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-stone-700">{label}</span>
                  </label>
                ))}
              </div>

              {/* ✅ Updated: Note/Comments field with example text */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Note / Comments
                </label>
                <textarea
                  rows={3}
                  value={foodRestrictions.other_text || ''}
                  onChange={(e) => onOtherTextChange(e.target.value)}
                  placeholder="e.g., Mr. is a carnivore, Mrs. is lactose & gluten intolerant"
                  className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                />
                <p className="text-xs text-stone-400 mt-1">
                  📝 Add any specific dietary notes or comments here
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  console.log('🔍 Step3: Back button clicked');
                  onBack();
                }}
                className="px-6 py-3 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium order-2 sm:order-1"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSave}  // ✅ Uses handleSave which calls onSave
                className="px-6 py-3 text-white font-medium rounded-lg transition-colors shadow-sm order-1 sm:order-2 flex-1 hover:opacity-90"
                style={{ backgroundColor: primaryColor || '#f59e0b' }}
              >
                Save and Continue →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
