# FastCheckIn Project Charter

**The constitution of this repository.**  
Read this before contributing. Full detail lives in [`docs/`](./docs/README.md).

---

## Mission

FastCheckIn exists so independent hospitality businesses can run **legally compliant, efficient, and guest-friendly operations** without enterprise complexity they do not need yet.

We replace paper and fragmented tools with one platform that supports the guest journey and the operator’s day-to-day work.

---

## Vision

Become the **complete operational platform for independent hospitality**—from digital check-in and compliance through operations, analytics, multi-establishment management, and enterprise-grade integration—growing with each property from Starter to Enterprise.

---

## Core principles

| Principle | Meaning |
|-----------|---------|
| **Documentation First** | No architectural, commercial, or user-facing feature is implemented before the relevant documentation is updated and approved. |
| **Single Source of Truth** | Packages, features, and decisions are defined in `docs/`—not reinvented in scattered code. |
| **Automation before duplication** | Prefer shared config, helpers, and enforcement over copy-pasted plan matrices and one-off gates. |
| **Stages, not paywalls** | Each package solves the *next* business problem; upgrades educate and unlock capability. |
| **Soft-lock, then enforce** | Discoverable premium features with clear upgrade UX; sensitive actions enforced on the server. |
| **Tenant safety** | Every query and export respects business (and future establishment) boundaries. |
| **Simplicity in the flow** | Reception stays fast; complexity belongs in ops and analytics, not the guest path. |
| **Long-term scalability** | Design for multi-establishment and enterprise fit without breaking the independent operator. |

---

## Development workflow

```text
Docs → Approval → Architecture → Code → Tests → Docs Update
```

1. **Docs** — Feature Registry, feature doc, package impact; Product Decision / AI docs if needed.  
2. **Approval** — Product Owner or reviewer signs off when required.  
3. **Architecture** — Fit the subscription, tenancy, and security model.  
4. **Code** — Implement to match the approved documentation.  
5. **Tests** — Happy path and package-sensitive paths as applicable.  
6. **Docs update** — Confirm docs and code still align in the same change set.

Feature pull requests must include: Feature Registry update · feature documentation · package impact review · Product Decision (if applicable) · AI documentation (if architecture changes).

---

## Definition of success

We succeed when we **deliver features that improve hospitality operations** while maintaining **consistency, quality, and long-term scalability**—so every contributor, human or AI, builds the same product.

---

## Authority

| Layer | Location |
|-------|----------|
| This charter | `PROJECT_CHARTER.md` (root) |
| Knowledge base | [`docs/`](./docs/README.md) |
| Agent rules | [`docs/AI/`](./docs/AI/README.md) |
| Decisions log | [`docs/PRODUCT/Product-Decisions.md`](./docs/PRODUCT/Product-Decisions.md) |
| Feature catalogue | [`docs/PRODUCT/Feature-Registry.md`](./docs/PRODUCT/Feature-Registry.md) |

Where practice conflicts with this charter, **stop and update documentation**—do not silently diverge.

---

*Adopted 30 July 2026 · Aligns with PD-006 and PD-008*
