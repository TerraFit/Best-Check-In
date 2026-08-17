# Rate Management

**Status:** Foundation (Step 5)  
**Branch:** `feature/rate-management-nightbridge`  
**Schema:** Migration `013_rate_management.sql` (production applied)

---

## Purpose

Provider-agnostic rate management for FastCheckIn so businesses can define seasonal room rates and specials, with a path to future NightBridge synchronization without redesigning the rate model.

## Core concepts

| Concept | Description |
|---------|-------------|
| **Season** | Date-range period (`effective_from`–`effective_to`). No mandatory year column. Mid optional. Same name may appear in multiple non-overlapping periods. |
| **Room rate** | Business + room + season + amount + provider. Room-specific. |
| **Special** | Fixed or percentage. `applies_to`: `all` \| `rooms` (one or many room IDs). |
| **Provider mapping** | Separate table linking FastCheckIn `room_id` ↔ external provider room ID. Never match by display name alone. |
| **Snapshot** | Immutable nightly `booking_rate_snapshots` (written in later steps). Authoritative historical pricing. |

## Provider abstraction

```
RateProvider (interface)
├── ManualFastCheckInProvider   ← implemented
└── NightBridgeRateProvider     ← future (same interface)
```

Application code resolves rates through a single resolution algorithm and does not branch on provider type for pricing logic.

## Special priority (deterministic)

1. Specific one-room special  
2. Multi-room special  
3. All-room special  
4. Seasonal room rate  

Conflicting specials at the **same** priority → clear error (never silent pick).

## Historical revenue

```
booking_rate_snapshots  →  SUM(resolved_rate)  →  bookings.room_revenue  →  analytics
```

Snapshots are immutable. `bookings.total_amount` and legacy `bookings.season` are unchanged.

## Out of scope (later steps)

- Booking confirmation integration / snapshot writes  
- UI (Rates & Seasons)  
- NightBridge API / sync  
- ADR / RevPAR analytics wiring  
- Guest Journey revenue dimensions  

## Code entry points

- Types: `src/types/rates.ts`  
- Provider contract: `src/services/rates/RateProvider.ts`  
- Manual provider: `src/services/rates/ManualFastCheckInProvider.ts`  
- Resolution: `src/services/rates/rateResolutionFoundation.ts`  
- Validation: `src/services/rates/rateValidation.ts`  
