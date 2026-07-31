# Commercial Foundation (Runtime)

**Status:** Implemented · Programme 1 finalisation  
**Branch for finalisation:** `programme/01-commercial-foundation-finalisation`  
**Related:** PD-007, PD-009 · [Commercial-Regression-Matrix.md](./Commercial-Regression-Matrix.md)

---

## Code single sources of truth

| Concern | Frontend | Backend (Netlify mirror — temporary) |
|---------|----------|--------------------------------------|
| Packages | `src/config/packages.ts` | `netlify/functions/lib/packages.js` |
| Features | `src/config/featureRegistry.ts` | `netlify/functions/lib/featureRegistry.js` |
| Flags | `src/config/featureFlags.ts` | `netlify/functions/lib/featureFlags.js` |
| Access API | `src/services/featureAccessService.ts` | `netlify/functions/lib/featureAccess.js` |
| Billing UI | Consumes packages + registry only | — |
| Entitlement calc | Consumes packages for prices | `get-subscription-status` uses packages |

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

Runtime flags may temporarily force-enable, force-disable, or override minimum package for a feature without changing the registry permanently.

---

## Lifecycle metadata

Each registry feature includes: `version`, `introduced`, `deprecated`.

Upgrade target is derived via `recommendUpgrade(current, minimumPackage)` (next logical tier).

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
