import { X, Check, ArrowRight, Sparkles } from 'lucide-react';
import { SubscriptionTier } from '../../types';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
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

  const getTierInfo = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'growth':
        return {
          title: 'Unlock Growth Analytics',
          color: 'from-blue-500 to-blue-600',
          textColor: 'text-blue-600',
          bgLight: 'bg-blue-50',
          badge: 'bg-blue-100 text-blue-800',
          price: '$49/mo',
          features: [
            'Break down visitors by individual Countries',
            'CSV & PDF reports export',
            'Up to 2,500 monthly guests checked in',
            'Custom QR Code branding templates',
          ]
        };
      case 'pro':
        return {
          title: 'Upgrade to Pro Insights',
          color: 'from-purple-500 to-purple-600',
          textColor: 'text-purple-600',
          bgLight: 'bg-purple-50',
          badge: 'bg-purple-100 text-purple-800',
          price: '$99/mo',
          features: [
            'Deep-dive into States, Provinces, & Regions',
            'Real-time webhook notifications',
            'Up to 10,000 monthly guests checked in',
            'Automated SMS pre-arrivals & check-ins',
          ]
        };
      case 'business':
        return {
          title: 'Deploy Business Intelligence',
          color: 'from-amber-500 to-amber-600',
          textColor: 'text-amber-600',
          bgLight: 'bg-amber-50',
          badge: 'bg-amber-100 text-amber-800',
          price: '$249/mo',
          features: [
            'Full City & Suburb level breakdowns (Grid view)',
            'Unlimited monthly guests checked in',
            'Dedicated account manager & 24/7 priority support',
            'Custom Domain & Whitelabel interface option',
          ]
        };
      default:
        return {
          title: 'Upgrade Your Plan',
          color: 'from-orange-500 to-orange-600',
          textColor: 'text-orange-600',
          bgLight: 'bg-orange-50',
          badge: 'bg-orange-100 text-orange-800',
          price: '$19/mo',
          features: [
            'More geographic intelligence & breakdowns',
            'Fast guest check-ins with QR Code',
            'Comprehensive visitor historical search',
          ]
        };
    }
  };

  const info = getTierInfo(targetTier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with color gradient */}
        <div className={`p-6 bg-gradient-to-r ${info.color} text-white relative`}>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded bg-white/20 text-xs font-semibold tracking-wide uppercase">
              Plan Upgrade Lock
            </span>
            <Sparkles size={16} className="text-amber-200 animate-pulse" />
          </div>
          
          <h3 className="text-2xl font-bold tracking-tight">
            {info.title}
          </h3>
          <p className="text-white/80 text-sm mt-1">
            Unlock <span className="font-semibold underline underline-offset-2">{info.features[0]}</span> and more.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-stone-100">
            <div>
              <span className="text-xs text-stone-400 font-medium uppercase tracking-wider block">Feature requested</span>
              <span className="text-sm font-semibold text-stone-800 capitalize">
                🔍 {featureName}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-400 font-medium uppercase tracking-wider block">Current Plan</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200 capitalize">
                {currentTier}
              </span>
            </div>
          </div>

          <p className="text-sm text-stone-600 mb-5 leading-relaxed">
            Geographic visitor origins are a premium analytics feature. Under your current <strong className="capitalize">{currentTier}</strong> tier, you have reached the maximum depth allowed. Upgrade your plan to expand your geographic insights:
          </p>

          <div className={`${info.bgLight} rounded-xl p-4 mb-6 border border-stone-100`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${info.badge}`}>
                Recommended: {targetTier} Plan
              </span>
              <span className="text-lg font-bold text-stone-900">
                {info.price}
              </span>
            </div>
            <ul className="space-y-2.5">
              {info.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-stone-700">
                  <Check size={14} className={`${info.textColor} mt-0.5 flex-shrink-0`} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onUpgrade}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-orange-500/10 hover:shadow-orange-500/20"
            >
              Upgrade Now <ArrowRight size={14} />
            </button>
            <button
              onClick={onCompare}
              className="py-3 px-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium rounded-xl text-sm transition-all text-center"
            >
              Compare All Plans
            </button>
          </div>

          {/* Slogan */}
          <p className="text-[10px] text-center text-stone-400 mt-5 uppercase tracking-widest font-semibold">
            ⚡ www.FastCheckin.co.za
          </p>
        </div>
      </div>
    </div>
  );
}
