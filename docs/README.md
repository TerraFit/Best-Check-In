# FastCheckIn Documentation

**Official knowledge base** for FastCheckIn (repository: Best-Check-In).

This documentation is the primary reference for product management, engineering, design, QA, marketing, business planning, investors, new team members, and **AI coding agents**.

> **Rule:** Read the relevant docs *before* writing code or changing product behaviour.

---

## Documentation First Principle

FastCheckIn is a **documentation-driven** project.

No architectural, commercial, or user-facing feature may be implemented before the relevant documentation has been updated and approved.

Feature pull requests must include: Feature Registry update · feature documentation · package impact review · Product Decision (if applicable) · AI documentation (if architecture changes).

Full statement: [AI/README.md — Documentation First Principle](./AI/README.md#documentation-first-principle).

---

## Quick start by role

| Role | Start here |
|------|------------|
| Product / Business | [PRODUCT/](./PRODUCT/) · [Feature Registry](./PRODUCT/Feature-Registry.md) · [Product Decisions](./PRODUCT/Product-Decisions.md) |
| Engineers | [ARCHITECTURE/](./ARCHITECTURE/) · [DEVELOPMENT/](./DEVELOPMENT/) · [DATABASE/](./DATABASE/) · [API/](./API/) |
| AI coding agents | **[AI/](./AI/)** (mandatory first read) |
| Design / UX | [DESIGN/](./DESIGN/) |
| QA | [DEVELOPMENT/Testing-Strategy.md](./DEVELOPMENT/Testing-Strategy.md) · [FEATURES/](./FEATURES/) |
| Marketing | [PRODUCT/Commercial-Blueprint.md](./PRODUCT/Commercial-Blueprint.md) · [PRODUCT/Package-Matrix.md](./PRODUCT/Package-Matrix.md) |
| Releases | [RELEASES/](./RELEASES/) |

---

## Documentation map

```text
docs/
├── README.md                 ← You are here
├── PRODUCT/                  Product vision, packages, registry, roadmap
├── ARCHITECTURE/             System design, auth, subscriptions, security
├── FEATURES/                 One doc per major feature
├── DESIGN/                   UI/UX standards
├── DEVELOPMENT/              Coding standards, Git, DoD
├── RELEASES/                 Roadmap, versions, checklists
├── API/                      Netlify functions & future public API
├── DATABASE/                 Schema, RLS, migrations
└── AI/                       Rules for AI coding agents
```

---

## Status labels used in docs

| Label | Meaning |
|-------|---------|
| **Current Implementation** | True of the codebase today |
| **Approved Direction** | Product Spec decision; may not be fully built |
| **Future Vision** | Planned; not committed to a release date |

When docs conflict with code, treat **Approved Direction** (Product Spec + Product Decisions) as the target; open a decision or implementation task rather than inventing behaviour.

---

## Single sources of truth

| Topic | Document |
|-------|----------|
| Product vision & packages | [PRODUCT/Product-Specification.md](./PRODUCT/Product-Specification.md) |
| Feature list & packages | [PRODUCT/Feature-Registry.md](./PRODUCT/Feature-Registry.md) |
| Architectural/commercial decisions | [PRODUCT/Product-Decisions.md](./PRODUCT/Product-Decisions.md) |
| How AI agents must work | [AI/README.md](./AI/README.md) |
| Subscription model | [ARCHITECTURE/Subscription-Architecture.md](./ARCHITECTURE/Subscription-Architecture.md) |

**Do not** re-define package names, prices, or feature gates in application code without updating these documents.

---

## Related repository entry points

- Root [README.md](../README.md) — project overview and setup  
- Application source: `src/`  
- Serverless: `netlify/functions/`  

---

*Documentation framework v1.0 · July 2026 · Documentation First Principle adopted PD-008*
