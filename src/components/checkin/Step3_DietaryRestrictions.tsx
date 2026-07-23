// src/components/checkin/Step3DietaryRestrictions.tsx
// ✅ RESTORED WITH EMOJIS - Only changed "Other (please specify)" to "Note / Comments"

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

// ✅ ORIGINAL RESTRICTION OPTIONS WITH EMOJIS - includes Carnivore
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
    <div className="p-6 md:p-8">
      {!showRestrictionsPanel ? (
        // Step 3a: Ask if they have restrictions
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-stone-800 mb-2">
              Do you have any dietary restrictions?
            </h3>
            <p className="text-sm text-stone-500">
              This helps us accommodate your needs during your stay.
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onHasDietaryRestrictionsChange(true)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                hasDietaryRestrictions === true
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-stone-200 hover:border-amber-300'
              }`}
            >
              ✅ Yes
            </button>
            <button
              type="button"
              onClick={() => onHasDietaryRestrictionsChange(false)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                hasDietaryRestrictions === false
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-stone-200 hover:border-amber-300'
              }`}
            >
              ❌ No
            </button>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 text-stone-600 hover:text-stone-800 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 py-2.5 px-4 text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Continue →
            </button>
          </div>
        </div>
      ) : (
        // Step 3b: Show dietary restrictions options
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-stone-800 mb-2">
              Select your dietary restrictions
            </h3>
            <p className="text-sm text-stone-500">
              Select all that apply, or add a note below
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {dietaryOptions.map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  foodRestrictions[option.id as keyof FoodRestrictions]
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!foodRestrictions[option.id as keyof FoodRestrictions]}
                  onChange={() => onRestrictionToggle(option.id)}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <span className="text-sm text-stone-700">{option.label}</span>
              </label>
            ))}
          </div>

          {/* ✅ ONLY CHANGE: "Other (please specify)" → "Note / Comments" with emoji */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              📝 Note / Comments
            </label>
            <input
              type="text"
              value={foodRestrictions.other_text || ''}
              onChange={(e) => onOtherTextChange(e.target.value)}
              placeholder="e.g., Mr. is a carnivore, Mrs. is lactose & gluten intolerant"
              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
            <p className="text-xs text-stone-400 mt-1">
              Add any specific dietary notes or comments here
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 text-stone-600 hover:text-stone-800 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 px-4 text-white rounded-lg transition-colors hover:opacity-90"
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
