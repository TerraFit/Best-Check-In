/**
 * Feature flags (Netlify mirror — keep in sync with src/config/featureFlags.ts)
 *
 * Modes:
 * - forceEnabled: allow feature regardless of package (ops/emergency)
 * - forceDisabled: deny even if package would allow
 * - overrideMinimumPackage: temporarily lower/raise package requirement
 * - enabled: master switch (default true if omitted)
 */

export const FEATURE_FLAGS = {
  // Examples (all inactive by default):
  // marketing_export: { forceEnabled: false, forceDisabled: false },
};

export function getFeatureFlag(featureId) {
  return FEATURE_FLAGS[featureId] || null;
}
