# Commercial Foundation (Runtime)

**Status:** Approved Direction · Programme 1  
**Related:** PD-007, PD-009 · [Subscription-Architecture.md](./Subscription-Architecture.md)

---

## Code single sources of truth

| Concern | Frontend | Backend (Netlify mirror — temporary) |
|---------|----------|--------------------------------------|
| Packages | `src/config/packages.ts` | `netlify/functions/lib/packages.js` |
| Features | `src/config/featureRegistry.ts` | `netlify/functions/lib/featureRegistry.js` |
| Flags | `src/config/featureFlags.ts` | `netlify/functions/lib/featureFlags.js` |
| Access API | `src/services/featureAccessService.ts` | `netlify/functions/lib/featureAccess.js` |

**Technical debt:** Keep mirrors in sync until a shared runtime module replaces the Netlify copies.

---

## Effective plan order

1. Complimentary plan entitlement  
2. Trial (entitlement or `subscription_status`)  
3. Paid `current_plan` / `subscription_tier`  

Package inheritance: higher `upgradeOrder` includes lower package features.

---

## Feature access

```text
checkFeatureAccess(featureId, context) →
  allowed | requiredPackage | recommendedPackage | reason | visibility | flags
```

Backend is authoritative for sensitive operations (exports). Frontend soft-locks for UX.

---

## Feature flags

Runtime flags may temporarily force-enable, force-disable, or override minimum package for a feature without changing the registry permanently. Flags are evaluated inside the access service.

---

## Lifecycle metadata

Each registry feature may include: `version`, `introduced`, `deprecated` (semver / ISO dates).

---

## Error contract (backend)

```json
{
  "error": "Feature requires a higher package",
  "code": "UPGRADE_REQUIRED",
  "featureId": "marketing_export",
  "requiredPackage": "growth",
  "recommendedPackage": "growth"
}
```
