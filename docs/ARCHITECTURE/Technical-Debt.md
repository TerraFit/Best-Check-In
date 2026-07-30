# Technical Debt (Architecture & Subscriptions)

| Item | Impact | Status |
|------|--------|--------|
| Plan/price/feature duplication | Drift, wrong upsell | **Reduced** — SSOT in `src/config` + Netlify mirror |
| Netlify mirror of config | Sync risk | **Open** — remove when shared module exists |
| USD in Upgrade modal | Trust | **Resolved** — ZAR from packages |
| Demo tier toggles on Reports | Fake enforcement | **Partial** — consumers should use `getAnalyticsLimits` |
| Weak export gating | Package leakage | **Resolved** — marketing + official register gated |
| No staff seat enforcement | Commercial leakage | **Open** — Programme 2 |
| Business ≠ multi-property | Cannot sell PD-003 | **Open** |
| AccessContext ignores subscription | Ad-hoc fetches | **Open** |
| `current_plan` + `subscription_tier` | Inconsistent reads | **Open** |
| Claimed modules missing (HK, L&F) | Support debt | **Open** |
| AI not package-scoped | Cost/value | **Open** |

Programme 1 (PD-009) addressed foundation items above marked Resolved/Reduced.
