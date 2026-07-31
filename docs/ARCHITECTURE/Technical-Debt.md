# Technical Debt (Architecture & Subscriptions)

| Item | Impact | Status |
|------|--------|--------|
| Plan/price/feature duplication in Billing | Drift | **Resolved** (finalisation branch) |
| PLAN_PRICING / PLAN_FEATURES in entitlementService | Drift | **Resolved** (finalisation branch) |
| SUBSCRIPTION_LIMITS hard table | Drift | **Resolved** (empty deprecated; use getAnalyticsLimits) |
| Netlify mirror of config | Sync risk | **Accepted** — Programme 2 shared module |
| USD in Upgrade modal | Trust | **Resolved** |
| Demo tier toggles production | Fake enforcement | **Resolved** (DEV only) |
| Weak export gating | Leakage | **Resolved** marketing + official register |
| Staff seat enforcement | Leakage | **Deferred** P2 — impact medium, priority high |
| Business ≠ multi-property | Cannot sell PD-003 | **Deferred** P2+ |
| AccessContext ignores subscription | Ad-hoc fetches | **Deferred** P2 |
| Dual current_plan / subscription_tier | Inconsistent | **Deferred** P2 |
| Housekeeping / L&F claimed | Support | **Deferred** Programme 2 ops |
| AI not package-scoped | Cost | **Deferred** P2 |
| Live staging matrix | Confidence | **Accepted** until QA runs checklist |
