# Commercial Regression Matrix — Programme 1

**Branch:** `programme/01-commercial-foundation-finalisation`  
**Method:** Static code review + designed enforcement paths. Live Netlify staging with real business IDs is required for production sign-off.

Legend: **Y** = allowed · **N** = denied / soft-lock · **—** = not productised · **B** = backend-enforced · **F** = frontend soft-lock only · **P** = planned/missing feature

## Package × feature (implemented registry)

| Feature id | Starter | Growth | Pro | Business | Enterprise | Enforcement |
|------------|---------|--------|-----|----------|------------|-------------|
| digital_checkin | Y | Y | Y | Y | Y | Core path (no gate) |
| visitor_overview | Y | Y | Y | Y | Y | F limits |
| visitor_countries | N | Y | Y | Y | Y | F (`getAnalyticsLimits`) |
| visitor_regions | N | N | Y | Y | Y | F |
| visitor_cities | N | N | N | Y | Y | F |
| referral_analytics | N | Y | Y | Y | Y | F (charts visible; product soft) |
| travel_patterns | N | N | Y | Y | Y | F partial |
| marketing_export | N | Y | Y | Y | Y | **B** `UPGRADE_REQUIRED` |
| official_register_export | N | N | Y | Y | Y | **B** `UPGRADE_REQUIRED` |
| audit_trail | N | N | Y | Y | Y | F partial |
| staff_portal | N | Y | Y | Y | Y | F partial (seats not B) |
| custom_branding | N | N | Y | Y | Y | F partial |

## Not yet productised (registry/docs only or missing)

| Area | Starter–Enterprise | Notes |
|------|--------------------|--------|
| Housekeeping | — | Missing product |
| Lost & Found | — | Missing product |
| AI Insights (tiered) | — | Gemini exists; not package-scoped |
| Booking integrations | — | Roadmap |
| Public API | Enterprise intent | Not shipped |
| QR check-in | Core | Not separately gated |

## Pricing / currency checks (static)

| Check | Result |
|-------|--------|
| Package prices ZAR 349/649/949/1290 | SSOT `packages.ts` / mirror |
| Billing cards from SSOT | Yes (finalisation) |
| Upgrade modal ZAR | Yes |
| No USD in upgrade modal | Yes |
| get-subscription-status pricing from SSOT | Yes |

## Subscription resolution (designed)

| Path | Expected |
|------|----------|
| Complimentary | Effective plan from entitlement; charge 0 |
| Trial | Charge 0; plan from business |
| Paid | Charge from package × discounts |

## Live staging checklist (Product Owner / QA)

- [ ] Starter business: marketing export → 403
- [ ] Growth business: marketing export → 200
- [ ] Starter: official register → 403
- [ ] Pro: official register → 200 (with password)
- [ ] Billing shows R amounts matching config
- [ ] Reports map soft-locks countries on Starter
- [ ] Complimentary business shows R0
- [ ] Trial business shows trial messaging

*Until live boxes are checked, Programme 1 is **code-complete** with **staging verification pending**.*
