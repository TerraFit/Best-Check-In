/**
 * Feature flags — keep in sync with netlify/functions/lib/featureFlags.js
 */

export interface FeatureFlag {
  enabled?: boolean;
  forceEnabled?: boolean;
  forceDisabled?: boolean;
  overrideMinimumPackage?: string;
}

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Empty by default — ops can enable overrides without changing registry.
};

export function getFeatureFlag(featureId: string): FeatureFlag | null {
  return FEATURE_FLAGS[featureId] || null;
}
