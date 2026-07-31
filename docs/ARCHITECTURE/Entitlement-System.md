# Entitlement System

**Types (code):** `trial` | `discount_percentage` | `discount_fixed` | `complimentary_plan` | `promo_code`

---

## Purpose

Grant time-bound or permanent commercial overrides without changing the feature matrix permanently.

## Lifecycle

- `starts_at`, `ends_at`, `lifetime`, `is_active`  
- Admin UI components: complimentary / trial modals under `src/components/admin/`  

## Rules

- Complimentary overrides effective plan.  
- Trial zeros charge while active.  
- Discounts adjust price only.  
- Promo validation should be server-authoritative (client placeholders exist).  

## Approved Direction

Use entitlements for temporary feature unlocks and A/B without forking package names in UI code.
