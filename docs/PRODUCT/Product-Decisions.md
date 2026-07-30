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

### PD-009 — Programme 1 Commercial Foundation runtime

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | Implement Programme 1: central package config, runtime feature registry (with lifecycle metadata), feature flags in entitlement/access layer, backend-first enforcement, temporary Netlify mirrors of config. No new commercial package meanings or list prices. |
| **Reason** | SSOT for packages/permissions; backend as authority; flags and lifecycle for safe rollout. |
| **Alternatives considered** | Frontend-only gates; delay flags until Programme 2. |
| **Impact** | `src/config/*`, `netlify/functions/lib/*`, Billing/Upgrade/Reports consumers, export gates. Mirror sync is tracked debt. |
| **Status** | Accepted — implementing |
| **Future review** | 2026-09-30 |

---

### PD-008 — Documentation First Principle

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | FastCheckIn is documentation-driven. No architectural, commercial, or user-facing feature may be implemented before relevant documentation is updated and approved. |
| **Reason** | Keep documentation and codebase aligned. |
| **Alternatives considered** | Docs-after-merge. |
| **Impact** | Binding for humans and AI agents. |
| **Status** | Accepted |
| **Future review** | 2027-01-30 |

---

### PD-001 — Product becomes operational platform

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | FastCheckIn is positioned as a complete operational platform for independent hospitality, not only digital registration. |
| **Reason** | Sustainable differentiation and ARPU expansion. |
| **Alternatives considered** | Stay check-in-only. |
| **Impact** | Roadmap modules and multi-establishment. |
| **Status** | Accepted |
| **Future review** | 2027-01-30 |

---

### PD-002 — Package ladder and jobs-to-be-done

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | Official packages: Starter, Growth, Pro, Business, Enterprise with JTBD progression. |
| **Reason** | Clear commercial journey. |
| **Alternatives considered** | Room-count-only SKUs. |
| **Impact** | Feature Registry maps every feature to a minimum package. |
| **Status** | Accepted |
| **Future review** | 2026-12-01 |

---

### PD-003 — Business defined by multi-establishment

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | Business package is primarily multi-establishment, not only 16–20 rooms. |
| **Reason** | Matches group buying; differentiates from Pro. |
| **Alternatives considered** | Business as pure analytics tier. |
| **Impact** | Establishments data model required (not Programme 1). |
| **Status** | Accepted (architecture gap open) |
| **Future review** | 2026-10-30 |

---

### PD-004 — Soft-lock upgrade education

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | Prefer soft-locks with educational upgrade UX; recommend next logical tier only. |
| **Reason** | Conversion and trust. |
| **Alternatives considered** | Hard-hide; always Enterprise. |
| **Impact** | Upgrade modal from registry. |
| **Status** | Accepted |
| **Future review** | 2026-11-15 |

---

### PD-005 — AI and analytics mature by package

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | AI and analytics deepen by tier. |
| **Reason** | Cost control and value narrative. |
| **Alternatives considered** | Binary AI on/off. |
| **Impact** | Geo limits by package. |
| **Status** | Accepted |
| **Future review** | 2026-12-01 |

---

### PD-006 — Documentation as governance

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | `/docs` is the official knowledge base; Feature Registry is mandatory. |
| **Reason** | Multi-contributor consistency. |
| **Alternatives considered** | Wiki-only. |
| **Impact** | Feature PRs update docs. |
| **Status** | Accepted |
| **Future review** | 2027-01-30 |

---

### PD-007 — Single source of truth for plans (target)

| Field | Value |
|-------|--------|
| **Date** | 2026-07-30 |
| **Decision** | Plan prices, limits, and feature gates live in one config surface; Netlify mirrors temporarily. |
| **Reason** | Stop ZAR/USD and list drift. |
| **Alternatives considered** | Per-file copies forever. |
| **Impact** | Programme 1 config modules. |
| **Status** | Accepted — in progress via PD-009 |
| **Future review** | 2026-09-30 |
