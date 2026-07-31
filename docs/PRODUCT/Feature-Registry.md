# Feature Registry

**Master catalogue.** No package-scoped feature should exist outside this registry.  
**Status column:** Current Implementation vs target package.

Categories: Reception · Guest Experience · Operations · Housekeeping · Lost & Found · Management · Marketing · Analytics · Artificial Intelligence · Integrations · Administration · Enterprise

Visibility: Internal | Prototype | Beta | Preview | Visible | Locked | Released | Deprecated

Implementation: Implemented | Partial | Planned | Missing

---

## Registry

| ID | Feature | Category | Package (min) | Visibility (target) | Implementation | Business benefit | Customer benefit | Upsell message |
|----|---------|----------|---------------|---------------------|----------------|------------------|------------------|----------------|
| F-001 | Digital guest check-in forms | Reception | Starter | Released | Implemented | Compliance at scale | Faster arrival | — |
| F-002 | ID / document capture | Reception | Starter | Released | Implemented | Statutory readiness | Less friction | — |
| F-003 | Digital signatures / indemnity | Reception | Starter | Released | Implemented | Risk reduction | Paperless sign-off | — |
| F-004 | Guest register / bookings list | Reception | Starter | Released | Implemented | Operational truth | Find guests fast | — |
| F-005 | QR / link check-in | Reception | Starter | Released | Implemented | Throughput | Guest self-service | — |
| F-006 | Multi-language check-in | Reception | Starter | Released | Implemented | International guests | Comfort | — |
| F-007 | POPIA / marketing consent | Reception | Starter | Released | Implemented | Lawful marketing | Clear choice | — |
| F-008 | Confirmation emails | Guest Experience | Growth | Released | Partial | Automation | Trust after booking | Automate confirmations on Growth |
| F-009 | Dietary / restrictions capture | Guest Experience | Starter | Released | Implemented | Service quality | Safer stays | — |
| F-010 | Guest messaging | Guest Experience | Future | Planned | Missing | Retention | Direct channel | — |
| F-011 | Employee accounts & roles | Operations | Growth | Released | Partial | Team coverage | Parallel work | Unlock more seats on Growth |
| F-012 | Employee overview dashboard | Operations | Growth | Released | Implemented | Floor awareness | See who is in-house | — |
| F-013 | Staff stay / diet updates | Operations | Growth | Released | Implemented | Ops accuracy | Fix data without owner | — |
| F-014 | Housekeeping board | Housekeeping | Growth | Planned | Missing | Room turn speed | Clear task list | Run housekeeping on Growth |
| F-015 | Lost & Found log | Lost & Found | Pro | Planned | Missing | Liability control | Guest recovery | Professional L&F on Pro |
| F-016 | Business profile & basic branding | Management | Starter | Released | Partial | Brand presence | Professional look | — |
| F-017 | Custom branding | Management | Pro | Released | Partial | Brand control | Logo & colours | Custom brand on Pro |
| F-018 | Multi-establishment management | Management | Business | Planned | Missing | Group ops | One dashboard | Manage all properties on Business |
| F-019 | Marketing contact export | Marketing | Growth | Locked | Partial | Campaign lists | Own your consenting guests | Export marketing lists on Growth |
| F-020 | Newsletter subscribe | Marketing | Starter | Released | Implemented | List growth | Easy opt-in | — |
| F-021 | Referral source analytics | Marketing | Growth | Released | Partial | Channel ROI | Know what works | See how guests found you on Growth |
| F-022 | Basic visitor overview | Analytics | Starter | Released | Partial | Situation awareness | Simple counts | — |
| F-023 | Country insights / map | Analytics | Growth | Released | Partial | Market focus | Target countries | Country origins on Growth |
| F-024 | Province / region insights | Analytics | Pro | Released | Partial | Regional strategy | Deeper geo | Regional drill-down on Pro |
| F-025 | City / trend insights | Analytics | Business | Preview | Partial | Local demand | City-level action | City insights on Business |
| F-026 | Cross-property BI | Analytics | Enterprise | Planned | Missing | Group intelligence | Compare sites | Enterprise BI |
| F-027 | Travel patterns / LOS charts | Analytics | Pro | Released | Partial | Product design | Understand stays | Advanced patterns on Pro |
| F-028 | Basic AI assistance | AI | Starter | Preview | Partial | Speed | Helpful copy/help | — |
| F-029 | Operational AI summaries | AI | Growth | Planned | Missing | Shift briefing | Less manual reporting | Daily ops summaries on Growth |
| F-030 | Business recommendation AI | AI | Pro | Planned | Missing | Decisions | Suggested actions | AI recommendations on Pro |
| F-031 | Predictive ops insights | AI | Business | Planned | Missing | Planning | Anticipate demand | Predictive insights on Business |
| F-032 | Custom AI reporting | AI | Enterprise | Planned | Missing | Board packs | Bespoke models | Enterprise AI |
| F-033 | CSV / Forms import | Integrations | Starter | Released | Implemented | Migration | Bring history | — |
| F-034 | Payment gateways | Integrations | Starter+ | Partial | Partial | Revenue collection | Pay in-app | — |
| F-035 | Public API | Integrations | Enterprise | Planned | Missing | Ecosystem | Connect systems | API on Enterprise |
| F-036 | Audit trail | Administration | Pro | Released | Implemented | Accountability | Who changed what | Full audit trail on Pro |
| F-037 | Super-admin tooling | Administration | Internal | Released | Implemented | Platform ops | Approve businesses | — |
| F-038 | Billing & subscriptions | Administration | All | Released | Implemented | Monetisation | Self-serve plans | — |
| F-039 | White label | Enterprise | Enterprise | Planned | Missing | Brand ownership | Your domain/UI | White label on Enterprise |
| F-040 | Official register export | Administration | Pro | Partial | Partial | Compliance packs | Statutory extracts | Official exports on Pro |

---

## Ownership

Default **Owner:** Product Owner (commercial) · Engineering Lead (implementation). Update Owner column in future revisions when team roles expand.

## Dependencies (high level)

- F-023–F-025 depend on visitor origin pipeline and live booking geo fields.  
- F-018 depends on establishments schema (not yet in **Current Implementation**).  
- F-019/F-040 require backend package gates (**Approved Direction**).  
- F-014, F-015 are net-new modules.  

Detail per feature: [FEATURES/](../FEATURES/).
