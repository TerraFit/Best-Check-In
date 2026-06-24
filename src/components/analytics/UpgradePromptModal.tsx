// src/components/analytics/UpgradePromptModal.tsx
import { useState } from 'react';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  targetTier: string;
  featureName: string;
  onUpgrade: () => void;
  onCompare: () => void;
}

export function UpgradePromptModal({
  isOpen,
  onClose,
  currentTier,
  targetTier,
  featureName,
  onUpgrade,
  onCompare
}: UpgradePromptModalProps) {
  if (!isOpen) return null;

  const getUpgradePath = (current: string): string[] => {
    const tiers = ['starter', 'growth', 'pro', 'business'];
    const currentIndex = tiers.indexOf(current);
    return tiers.slice(currentIndex + 1);
  };

  const upgradePath = getUpgradePath(currentTier);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-stone-900 text-center mb-2">
          Unlock More Geographic Insights
        </h3>

        {/* Description */}
        <p className="text-stone-600 text-sm text-center mb-6">
          You're currently viewing visitor totals by {featureName}.
        </p>

        {/* Upgrade Path */}
        <div className="bg-stone-50 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Upgrade to explore:
          </p>
          <ul className="space-y-2 text-sm">
            {upgradePath.includes('growth') && (
              <li className="flex items-center gap-2 text-stone-700">
                <span className="text-amber-500">⬆️</span>
                <span><strong>Growth</strong> — View countries within each continent</span>
              </li>
            )}
            {upgradePath.includes('pro') && (
              <li className="flex items-center gap-2 text-stone-700">
                <span className="text-amber-500">⬆️</span>
                <span><strong>Pro</strong> — Explore states, provinces, and regions</span>
              </li>
            )}
            {upgradePath.includes('business') && (
              <li className="flex items-center gap-2 text-stone-700">
                <span className="text-amber-500">⬆️</span>
                <span><strong>Business</strong> — Discover city and town-level visitor origins</span>
              </li>
            )}
          </ul>
        </div>

        {/* Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>See exactly where your guests come from and make better marketing decisions.</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onUpgrade}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
          >
            🚀 Upgrade Now
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCompare}
              className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors"
            >
              Compare Plans
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
