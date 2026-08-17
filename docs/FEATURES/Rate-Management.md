# Rate Management

**Status:** Steps 5–6 complete  
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

## Data access (Step 6)

Architecture:

```
Frontend rateApi.ts
        ↓
Netlify Functions (JWT auth)
        ↓
Supabase REST (service role)
        ↓
Production tables (RLS + triggers)
```

### Endpoints

| Function | Methods | Notes |
|----------|---------|-------|
| `manage-seasons` | GET, POST, PATCH | Business-scoped seasons |
| `manage-room-rates` | GET, POST, PATCH | Room + season ownership checked |
| `manage-rate-specials` | GET, POST, PATCH | applies_to all\|rooms |
| `manage-rate-provider-mappings` | GET, POST, PATCH | External room identity |
| `list-booking-rate-snapshots` | GET only | **Read-only** — no writes |

### Authentication

- JWT required (`Authorization: Bearer …`)
- `user_metadata.business_id` is the authoritative tenant
- Request `businessId` is consistency-checked only; mismatch → 403
- All queries filter `business_id = authenticatedBusinessId`

### Snapshots

Read-only in Step 6. No insert/update/delete endpoints. DB triggers still forbid mutation.

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
- Frontend API: `src/services/rates/rateApi.ts`  
- Netlify: `netlify/functions/manage-*.js`, `list-booking-rate-snapshots.js`  
