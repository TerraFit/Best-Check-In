# Technical Debt (Architecture & Subscriptions)

| Item | Impact | Direction |
|------|--------|-----------|
| Plan/price/feature duplication | Drift, wrong upsell | Single config |
| USD in Upgrade modal vs ZAR Billing | Trust | Config-driven ZAR |
| Demo tier toggles on Reports | Fake enforcement | Real effective plan |
| Weak export gating | Package leakage | Backend checks |
| No staff seat limits | Commercial leakage | Enforce on invite APIs |
| Business ≠ multi-property in schema | Cannot sell PD-003 | Establishments model |
| AccessContext ignores subscription | Ad-hoc fetches | Subscription context |
| `current_plan` + `subscription_tier` | Inconsistent reads | Canonical field |
| Claimed modules missing (HK, L&F) | Support/marketing debt | Build or unclaim |
| AI not package-scoped | Cost/value mismatch | Tier AI features |

Source: Package & Upsell Analysis + Product Spec v1.0 (July 2026).
