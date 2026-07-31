# Subscription Architecture

**Related:** [Entitlement-System.md](./Entitlement-System.md) · [PRODUCT/Package-Matrix.md](../PRODUCT/Package-Matrix.md)

---

## Effective plan resolution

1. Active **complimentary_plan** entitlement  
2. Active **trial** (entitlement or `subscription_status`)  
3. Else **billing plan** (`current_plan` / `subscription_tier`) with discounts applied  

Implemented in spirit by `entitlementService` and `get-subscription-status`.

## Dual fields (debt)

Code references both `current_plan` and `subscription_tier`. **Approved Direction:** single canonical field + migration.

## Plan definitions (target SSOT)

Should not be duplicated across:

- `src/pages/Billing.tsx`  
- `src/services/entitlementService.ts`  
- `netlify/functions/get-subscription-status.js`  
- Upgrade modal hard-coded prices  

## Room rules (Current Implementation)

- Minimum plan can depend on room count for **downgrades**.  
- Upgrades allowed above room band for capability.  

## Multi-establishment (Approved Direction)

Business package enables multiple establishments; billing and feature matrix must account for that model.
