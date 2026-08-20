import { useTranslation } from '../../i18n';
import { X, Check, ArrowRight, Sparkles } from 'lucide-react';
import { getPackage, type PlanType } from '../../config/packages';
import { getFeature } from '../../config/featureRegistry';
import { recommendUpgrade, normalizePlanId } from '../../config/packages';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  /** Preferred: feature registry id */
  featureId?: string;
  /** Legacy: free-text feature name */
  featureName?: string;
  targetTier?: string;
  onUpgrade: () => void;
  onCompare: () => void;
}

export function UpgradePromptModal({
  isOpen,
  onClose,
  currentTier,
  featureId,
  featureName,
  targetTier,
  onUpgrade,
  onCompare,
}: UpgradePromptModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const feature = featureId ? getFeature(featureId) : null;
  const required = normalizePlanId(
    targetTier || feature?.minimumPackage || 'growth'
  );
  const current = normalizePlanId(currentTier);
  const recommended = recommendUpgrade(current, required) as PlanType;
  const pkg = getPackage(recommended);

  const title = feature
    ? `Unlock ${feature.name}`
    : `Unlock ${featureName || 'this feature'}`;

  const bodyText =
    feature?.upsellMessage ||
    `${featureName || 'This feature'} is available from the ${pkg.name} package. Upgrade to unlock capabilities that save time and improve decisions.`;

  const benefits = [
    feature?.businessBenefit,
    feature?.customerBenefit,
    pkg.description,
    `Up to ${pkg.maxRooms ?? 'custom'} rooms guidance`,
    pkg.maxStaff != null ? `Up to ${pkg.maxStaff} staff accounts` : 'Custom staff capacity',
    `From R${pkg.priceMonthly}/month (ZAR)`,
  ].filter(Boolean) as string[];

  const displayFeatureName = feature?.name || featureName || 'Premium feature';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-600 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label={t('reports_close_modal')}
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded bg-white/20 text-xs font-semibold tracking-wide uppercase">
              Upgrade required
            </span>
            <Sparkles size={16} className="text-amber-200" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
          <p className="text-white/80 text-sm mt-1">{bodyText}</p>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-stone-100">
            <div>
              <span className="text-xs text-stone-400 font-medium uppercase tracking-wider block">
                Feature
              </span>
              <span className="text-sm font-semibold text-stone-800">{displayFeatureName}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-400 font-medium uppercase tracking-wider block">
                Current package
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200 capitalize">
                {getPackage(current).name}
              </span>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100">
            <div className="flex justify-between items-center mb-3">
              <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                Recommended: {pkg.name}
              </span>
              <span className="text-lg font-bold text-stone-900">
                {pkg.contactSales ? 'Custom' : `R${pkg.priceMonthly}/mo`}
              </span>
            </div>
            <p className="text-xs text-stone-600 mb-3">{pkg.description}</p>
            <ul className="space-y-2.5">
              {benefits.slice(0, 6).map((b, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-stone-700">
                  <Check size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onUpgrade}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm shadow-md"
            >
              Upgrade Now <ArrowRight size={14} />
            </button>
            <button
              onClick={onCompare}
              className="py-3 px-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium rounded-xl text-sm"
            >
              Compare packages
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-xs text-stone-500 hover:text-stone-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpgradePromptModal;
