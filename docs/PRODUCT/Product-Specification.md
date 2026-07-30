# Product Specification v1.0 (Summary)

**Status:** Approved Direction  
**Full narrative:** Maintained as the product architecture baseline (July 2026).  
**Related:** [Product-Vision.md](./Product-Vision.md) · [Feature-Registry.md](./Feature-Registry.md) · [Product-Decisions.md](./Product-Decisions.md)

---

## Executive summary

FastCheckIn evolves from digital guest registration into a **staged operational platform** for independent hospitality. Packages follow operator maturity: Starter → Growth → Pro → Business → Enterprise.

**Business** is defined primarily by **multi-establishment**. **Enterprise** is organisational fit (API, white label, custom, security)—not merely “more rooms.”

---

## Principles

Simplicity · Automation · Operational efficiency · Guest experience · Legal compliance · Business intelligence · Scalability · Consistency

---

## Feature rules

- Every feature belongs to **exactly one** category (Reception, Guest Experience, Operations, Housekeeping, Lost & Found, Management, Marketing, Analytics, AI, Integrations, Administration, Enterprise).  
- Every feature defines: description, benefits, package, visibility, dependencies, future enhancements, upsell message.  
- Visibility: `Internal` | `Prototype` | `Beta` | `Preview` | `Visible` | `Locked` | `Released` | `Deprecated`.

---

## AI maturity by package

| Package | AI posture |
|---------|------------|
| Starter | Basic assistance |
| Growth | Operational summaries |
| Pro | Business recommendations |
| Business | Predictive operational insights |
| Enterprise | Custom AI reporting |

---

## Analytics maturity by package

| Package | Analytics posture |
|---------|-------------------|
| Starter | Basic visitor overview |
| Growth | Country insights |
| Pro | Province / regional insights |
| Business | City-level + trends (multi-site intent) |
| Enterprise | Cross-property BI |

---

## Architecture implications

1. Single commercial config (plans, prices, gates).  
2. `checkFeatureAccess`-style helper on UI and backend.  
3. Soft-lock upgrade education.  
4. Establishments model for Business.  
5. Enforce exports, seats, and multi-site on the server.  

**Current Implementation** gaps are tracked in [ARCHITECTURE/Technical-Debt.md](../ARCHITECTURE/Technical-Debt.md).

---

## Phased delivery

See [Product-Roadmap.md](./Product-Roadmap.md) and [RELEASES/Roadmap.md](../RELEASES/Roadmap.md).
