// src/components/checkin/Step3DietaryRestrictions.tsx
// ✅ EXACT ORIGINAL RESTORED - Only changed "Other (please specify)" to "Note / Comments"

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
  onSave: () => void;
  onBack: () => void;
  primaryColor?: string;
}

// ✅ ORIGINAL RESTRICTION OPTIONS WITH EMOJIS
const dietaryOptions = [
  { id: 'vegetarian', label: '🥬 Vegetarian' },
  { id: 'vegan', label: '🌱 Vegan' },
  { id: 'carnivore', label: '🥩 Carnivore' },
  { id: 'gluten_free', label: '🌾 Gluten Free' },
  { id: 'lactose_free', label: '🥛 Lactose Free' },
  { id: 'nut_allergy', label: '🥜 Nut Allergy' },
  { id: 'shellfish_allergy', label: '🦐 Shellfish Allergy' },
  { id: 'diabetic', label: '💉 Diabetic' },
  { id: 'halal', label: '☪️ Halal' },
  { id: 'kosher', label: '✡️ Kosher' },
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
  onSave,
  onBack,
  primaryColor = '#f59e0b',
}: Step3DietaryRestrictionsProps) {
  
  const handleSave = () => {
    const hasSelected = Object.entries(foodRestrictions).some(
      ([key, val]) => val === true && key !== 'other_text'
    );
    if (!hasSelected && !foodRestrictions.other_text) {
      alert('Please select at least one dietary restriction or add a note.');
      return;
    }
    onSave();
  };

  return (
    <div className="p-10 md:p-16">
      {!showRestrictionsPanel ? (
        // Step 3a: Ask if they have restrictions
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Dietary Preferences</h2>
          <p className="text-stone-500 mb-8">Let us know about any dietary requirements</p>
          
          <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
            <p className="text-lg font-medium text-stone-800 mb-6">
              Do you have any dietary restrictions?
            </p>
            <p className="text-sm text-stone-500 mb-6">
              This helps us accommodate your needs during your stay.
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
                ✅ Yes
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
                ❌ No
              </button>
            </div>
          </div>

          <div className="flex gap-4 mt-8 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 py-3 px-6 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Continue →
            </button>
          </div>
        </div>
      ) : (
        // Step 3b: Show dietary restrictions options
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Dietary Preferences</h2>
          <p className="text-stone-500 mb-8">Let us know about any dietary requirements</p>
          
          <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
            <p className="text-lg font-medium text-stone-800 mb-4">
              Select your dietary restrictions
            </p>
            <p className="text-sm text-stone-500 mb-6">
              Select all that apply, or add a note below
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

            {/* ✅ ONLY CHANGE: "Other (please specify)" → "📝 Note / Comments" */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                📝 Note / Comments
              </label>
              <input
                type="text"
                value={foodRestrictions.other_text || ''}
                onChange={(e) => onOtherTextChange(e.target.value)}
                placeholder="e.g., Mr. is a carnivore, Mrs. is lactose & gluten intolerant"
                className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-sm"
              />
              <p className="text-xs text-stone-400 mt-1">
                Add any specific dietary notes or comments here
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-8 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 px-6 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Save and Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
