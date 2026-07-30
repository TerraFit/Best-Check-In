# Product Decisions

**Living record** of major architectural and commercial decisions.  
**Rule:** Material changes to packages, multi-tenancy, or enforcement require a new entry.

---

## How to add a decision

1. Assign next `PD-XXX` number.  
2. Fill all fields.  
3. Link related PRs/issues when implemented.  
4. Set **Future Review Date** for reversible decisions.  

---

### PD-008 — Documentation First Principle

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | FastCheckIn is documentation-driven. No architectural, commercial, or user-facing feature may be implemented before relevant documentation is updated and approved. Feature PRs must include Feature Registry update, feature docs, package impact review, Product Decision (if applicable), and AI docs (if architecture changes). |
| **Reason** | Keep documentation and codebase aligned; prevent agent/human drift on packages and behaviour. |
| **Alternatives considered** | Docs-after-merge; optional docs in DoD only. |
| **Impact** | Binding for humans and AI agents; encoded in `docs/AI/README.md`, Coding Rules, Adding Features, PR guidelines, and Definition of Done. |
| **Status** | Accepted |
| **Future review** | 2027-01-30 |

---

### PD-001 — Product becomes operational platform

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | FastCheckIn is positioned as a complete operational platform for independent hospitality, not only digital registration. |
| **Reason** | Sustainable differentiation and ARPU expansion aligned with operator maturity. |
| **Alternatives considered** | Stay check-in-only; pivot to full chain PMS. |
| **Impact** | Roadmap includes Housekeeping, Lost & Found, multi-establishment, enterprise APIs. |
| **Status** | Accepted |
| **Future review** | 2027-01-30 |

---

### PD-002 — Package ladder and jobs-to-be-done

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | Official packages: Starter, Growth, Pro, Business, Enterprise with JTBD progression. |
| **Reason** | Clear commercial journey; avoids feature dumping into one tier. |
| **Alternatives considered** | Room-count-only SKUs; freemium-only. |
| **Impact** | Feature Registry and matrix must map every feature to a minimum package. |
| **Status** | Accepted |
| **Future review** | 2026-12-01 |

---

### PD-003 — Business defined by multi-establishment

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | Business package is primarily **multi-establishment**, not only 16–20 rooms. |
| **Reason** | Matches real hospitality group buying; differentiates from Pro. |
| **Alternatives considered** | Business as pure analytics tier. |
| **Impact** | Requires establishments data model; current single-tenant analytics insufficient. |
| **Status** | Accepted (architecture gap open) |
| **Future review** | 2026-10-30 |

---

### PD-004 — Soft-lock upgrade education

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | Prefer soft-locks with educational upgrade UX; recommend next logical tier only. |
| **Reason** | Conversion and trust; “Upgrade Required” alone is insufficient. |
| **Alternatives considered** | Hard-hide premium nav; always upsell Enterprise. |
| **Impact** | Design system for Upgrade Modal; shared permission helper. |
| **Status** | Accepted |
| **Future review** | 2026-11-15 |

---

### PD-005 — AI and analytics mature by package

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | AI and analytics deepen by tier (basic → ops → recommendations → predictive → custom). |
| **Reason** | Cost control and clear value narrative. |
| **Alternatives considered** | Binary AI on/off. |
| **Impact** | Gemini usage must be scoped; analytics drill maps to Growth/Pro/Business. |
| **Status** | Accepted |
| **Future review** | 2026-12-01 |

---

### PD-006 — Documentation as governance

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | `/docs` is the official knowledge base; Feature Registry is mandatory for features. |
| **Reason** | Multi-agent and multi-contributor consistency. |
| **Alternatives considered** | Wiki-only; code comments only. |
| **Impact** | PRs that add package-scoped features must update docs. |
| **Status** | Accepted |
| **Future review** | 2027-01-30 |

---

### PD-007 — Single source of truth for plans (target)

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | Plan prices, limits, and feature gates must eventually live in one config surface; no divergent hard-coding. |
| **Reason** | Current duplication causes ZAR/USD drift and inconsistent feature lists. |
| **Alternatives considered** | Keep per-file copies. |
| **Impact** | Refactor Billing, entitlementService, Netlify status, Upgrade modal. |
| **Status** | Accepted (not yet implemented) |
| **Future review** | 2026-09-30 |

---

*Add new decisions above PD-001 in reverse chronological order within the same format (PD-008 is the latest).*
