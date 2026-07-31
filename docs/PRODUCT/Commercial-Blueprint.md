# Commercial Blueprint

**Status:** Approved Direction  
**Related:** [Package-Matrix.md](./Package-Matrix.md) · [Pricing-Philosophy.md](./Pricing-Philosophy.md)

---

## Philosophy

Every package must solve the customer’s **next business challenge**, not merely unlock more features. Customers should feel they are investing in the next stage of their business.

```text
Starter → Growth → Pro → Business → Enterprise
```

| Package | Job-to-be-done |
|---------|----------------|
| **Starter** | Replace paper; digitise reception; stay compliant |
| **Growth** | Daily operations, housekeeping, clearer analytics, more staff |
| **Pro** | Professional management: audit, lost & found, AI recommendations, advanced reporting |
| **Business** | **Multiple establishments** under one business dashboard |
| **Enterprise** | White label, API, custom integrations, dedicated support, enterprise security |

---

## Structural rules

| Package | Rooms (typical) | Staff accounts (max) | Defining trait |
|---------|-----------------|----------------------|----------------|
| Starter | Up to 5 | 3 | Single establishment |
| Growth | Up to 10 | 8 | Single establishment |
| Pro | Up to 15 | 20 | Single establishment |
| Business | Often ~16–20 **or** multi-site | Per commercial rules | **Multi-establishment** |
| Enterprise | Custom | Custom | Org fit (API, WL, SSO, custom) |

**Important:** Business is **not** defined only by room count. Multi-establishment is the primary definition (**Approved Direction**). Current code largely treats Business as a higher single-tenant analytics tier (**Current Implementation** gap).

---

## Upgrade philosophy

- Prefer **soft-locks** (feature visible, use triggers education).  
- Recommend the **next logical package**, not Enterprise by default.  
- Explain value, time saved, and business impact—never only “Upgrade Required.”  

See [DESIGN/Upgrade-Modal.md](../DESIGN/Upgrade-Modal.md) and [ARCHITECTURE/Subscription-Architecture.md](../ARCHITECTURE/Subscription-Architecture.md).

---

## Indicative pricing (Current Implementation UI)

| Package | Monthly (ZAR) | Yearly (ZAR) |
|---------|---------------|--------------|
| Starter | 349 | 3,490 |
| Growth | 649 | 6,490 |
| Pro | 949 | 9,490 |
| Business | 1,290 | 12,900 |
| Enterprise | Custom | Custom |

Prices may change commercially; engineering must not hard-code alternate currencies in customer-facing upgrade UI.
